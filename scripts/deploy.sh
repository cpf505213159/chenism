#!/usr/bin/env bash
# chenism 服务器一键更新 / 回滚（在服务器上执行，不是在开发环境）
#
#   bash scripts/deploy.sh                 # 常规更新：同步代码 -> 隔离构建 -> 切换 -> 验证
#   bash scripts/deploy.sh --status       # 查看当前版本、快照、健康状态（不受部署锁阻塞）
#   bash scripts/deploy.sh --rollback     # 秒级回滚到上一版构建（再执行一次切回来）
#   bash scripts/deploy.sh --sync-content# 用 Git 仓库的 content/ 覆盖服务器后台内容（慎用）
#
# 设计要点
#  - 代码走 Git，内容走 /admin 后台：content/ 在更新时自动快照并恢复，
#    避免 git reset --hard 覆盖后台在线编辑过的简历 / 项目文档。
#  - 用 NEXT_DIST_DIR=.next.build 把产物输出到独立目录，构建全程不触碰运行中的
#    .next；构建失败线上零影响。不能把源码复制出去用 symlink 构建——Next 16 的
#    Turbopack 要求 node_modules 位于工作区内，会直接报 "Could not find Next.js"。
#  - 唯一停机窗口是「替换 .next + pm2 restart」，约 3~5 秒。
#  - 保留 .next.prev 作为回滚快照；切换后任一健康检查失败自动回滚。
#  - 并发锁防止两个部署互相踩；每步失败都有明确日志。

set -Eeuo pipefail

APP="${APP:-chenism}"
ROOT="${ROOT:-/opt/chenism}"
BRANCH="${BRANCH:-main}"
PORT="${PORT:-3100}"
HOST_HEADER="${HOST_HEADER:-chenism.dev}"
LOCK="$ROOT/.deploy.lock"
STATE="$ROOT/logs/deploy.state"
LOG="$ROOT/logs/deploy.log"
BUILD_DIR=".next.build"

MODE="${1:-update}"
SYNC_CONTENT=0
SWITCHED=0

mkdir -p "$ROOT/logs"
exec > >(tee -a "$LOG") 2>&1
echo "---------- $(date '+%F %T')  deploy $MODE  ----------"

CONTENT_BAK="$(mktemp -d /tmp/chenism-content.XXXXXX)"

acquire_lock() {
  exec 9>"$LOCK"
  if ! flock -n 9; then
    echo "ERROR: 已有部署任务在运行（锁 $LOCK），本次退出"
    exit 1
  fi
}

health_check() {
  for _ in $(seq 1 15); do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 \
      -H "Host: $HOST_HEADER" "http://127.0.0.1:$PORT/" 2>/dev/null || echo 000)"
    [ "$code" = "200" ] && return 0
    sleep 2
  done
  return 1
}

verify_endpoints() {
  local cc ask via_nginx
  cc="$(curl -s -D - -o /dev/null -H "Host: $HOST_HEADER" \
    "http://127.0.0.1:$PORT/resume.json" 2>/dev/null | grep -i '^cache-control' || true)"
  echo "$cc" | grep -qi 'no-store' || { echo "FAIL /resume.json 缓存头异常: ${cc:-无}"; return 1; }

  ask="$(curl -s -X POST -H 'content-type: application/json' \
    -d '{"q":"指标口径是怎么统一的"}' --max-time 10 \
    "http://127.0.0.1:$PORT/api/ask" 2>/dev/null || true)"
  echo "$ask" | grep -q '"ok":true' || { echo "FAIL /api/ask 未命中: ${ask:0:120}"; return 1; }

  via_nginx="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 \
    -H "Host: $HOST_HEADER" http://127.0.0.1/ 2>/dev/null || echo 000)"
  [ "$via_nginx" = "200" ] || { echo "FAIL nginx 反代异常: $via_nginx"; return 1; }
  return 0
}

# 构建时 distDir 会被写进产物配置，改名成 .next 后要改回来，
# 否则 next start 会按 .next.build 去找文件。
fix_dist_dir() {
  node -e '
    const fs = require("fs");
    const f = process.argv[1];
    if (!fs.existsSync(f)) process.exit(0);
    const j = JSON.parse(fs.readFileSync(f, "utf8"));
    if (j.config && j.config.distDir && j.config.distDir !== ".next") {
      j.config.distDir = ".next";
      fs.writeFileSync(f, JSON.stringify(j));
    }
  ' "$ROOT/.next/required-server-files.json" 2>/dev/null || true
}

rollback_now() {
  echo "!! 自动回滚到上一版构建"
  if [ ! -d "$ROOT/.next.prev" ]; then
    echo "FAIL 缺少 .next.prev 快照，无法自动回滚，请人工检查: pm2 logs $APP"
    return 1
  fi
  rm -rf "$ROOT/.next.failed"
  mv "$ROOT/.next" "$ROOT/.next.failed" 2>/dev/null || true
  mv "$ROOT/.next.prev" "$ROOT/.next"
  fix_dist_dir
  pm2 restart "$APP" --update-env >/dev/null 2>&1 || true
  if health_check && verify_endpoints; then
    echo "OK 自动回滚成功，服务已恢复"
  else
    echo "FAIL 回滚后仍不健康，请人工介入: pm2 logs $APP / $LOG"
  fi
}

on_error() {
  local code=$?
  if [ "$SWITCHED" = "1" ]; then
    rollback_now || true
  fi
  exit "$code"
}
trap on_error ERR
trap 'rm -rf "$CONTENT_BAK" "$ROOT/$BUILD_DIR"' EXIT

case "$MODE" in
  --status|status)
    echo "当前 commit : $(git -C "$ROOT" rev-parse --short HEAD)"
    echo "远程 commit : $(git -C "$ROOT" rev-parse --short "origin/$BRANCH" 2>/dev/null || echo 未知)"
    echo "上次成功   : $(cat "$STATE" 2>/dev/null || echo 无记录)"
    echo "构建快照   : .next=$([ -d "$ROOT/.next" ] && echo 有 || echo 无) / .next.prev=$([ -d "$ROOT/.next.prev" ] && echo 有 || echo 无)"
    echo -n "本机健康检查: "
    curl -s -o /dev/null -w '%{http_code}\n' --max-time 5 -H "Host: $HOST_HEADER" "http://127.0.0.1:$PORT/"
    pm2 list 2>/dev/null | grep -E "$APP|name" | head -3
    exit 0
    ;;
  --rollback|rollback)
    acquire_lock
    [ -d "$ROOT/.next.prev" ] || { echo "FAIL 没有 .next.prev 快照可回滚"; exit 1; }
    tmp="$ROOT/.next.swap"
    rm -rf "$tmp"
    mv "$ROOT/.next" "$tmp"
    mv "$ROOT/.next.prev" "$ROOT/.next"
    mv "$tmp" "$ROOT/.next.prev"
    fix_dist_dir
    pm2 restart "$APP" --update-env >/dev/null 2>&1
    if ! health_check || ! verify_endpoints; then
      echo "FAIL 回滚后验证失败，请人工检查"
      exit 1
    fi
    echo "OK 回滚完成（再次执行 --rollback 会切回当前版本）"
    exit 0
    ;;
  --sync-content) SYNC_CONTENT=1 ;;
  update|--update|"") SYNC_CONTENT=0 ;;
  *) echo "用法: bash scripts/deploy.sh [--status|--rollback|--sync-content]"; exit 2 ;;
esac

acquire_lock

echo "[1/7] 预检"
[ -d "$ROOT/.git" ] || { echo "FAIL $ROOT 不是 git 仓库"; exit 1; }
command -v pnpm >/dev/null || { echo "FAIL pnpm 未安装"; exit 1; }
avail="$(df -m "$ROOT" | awk 'NR==2 {print $4}')"
[ "${avail:-0}" -ge 1024 ] || { echo "FAIL 可用磁盘不足 1G (${avail}M)"; exit 1; }
git -C "$ROOT" rev-parse --verify HEAD >/dev/null

echo "[2/7] 保护后台内容数据"
if [ "$SYNC_CONTENT" = "0" ]; then
  cp -a "$ROOT/content/." "$CONTENT_BAK/"
  echo "  content/ 已快照（在线后台编辑的数据优先保留）"
else
  echo "  --sync-content：本次用 Git 仓库内容覆盖服务器内容"
fi

echo "[3/7] 同步代码 origin/$BRANCH"
git -C "$ROOT" fetch --quiet origin "$BRANCH"
OLD="$(git -C "$ROOT" rev-parse --short HEAD)"
git -C "$ROOT" reset --hard --quiet "origin/$BRANCH"
NEW="$(git -C "$ROOT" rev-parse --short HEAD)"
echo "  $OLD -> $NEW"
if [ "$SYNC_CONTENT" = "0" ]; then
  rm -rf "$ROOT/content"
  mkdir -p "$ROOT/content"
  cp -a "$CONTENT_BAK/." "$ROOT/content/"
  echo "  已恢复服务器后台内容"
fi

echo "[4/7] 依赖 pnpm install --frozen-lockfile"
(cd "$ROOT" && pnpm install --frozen-lockfile --prefer-offline) 2>&1 | tail -8

echo "[5/7] 隔离构建（NEXT_DIST_DIR=$BUILD_DIR，不影响线上）"
rm -rf "$ROOT/$BUILD_DIR"
(cd "$ROOT" && NEXT_DIST_DIR="$BUILD_DIR" pnpm build) 2>&1 | tail -20
[ -f "$ROOT/$BUILD_DIR/BUILD_ID" ] || { echo "FAIL 构建产物缺失 BUILD_ID"; exit 1; }
echo "  BUILD_ID=$(cat "$ROOT/$BUILD_DIR/BUILD_ID")"

echo "[6/7] 切换产物并重启（停机窗口约 3-5s）"
rm -rf "$ROOT/.next.prev"
mv "$ROOT/.next" "$ROOT/.next.prev"
mv "$ROOT/$BUILD_DIR" "$ROOT/.next"
fix_dist_dir
SWITCHED=1
pm2 restart "$APP" --update-env >/dev/null 2>&1
pm2 save >/dev/null 2>&1 || true

echo "[7/7] 健康检查"
if ! health_check; then
  echo "FAIL 首页不健康"
  rollback_now || true
  SWITCHED=0
  exit 1
fi
if ! verify_endpoints; then
  echo "FAIL 关键端点验证失败"
  rollback_now || true
  SWITCHED=0
  exit 1
fi

SWITCHED=0
echo "$NEW $(date '+%F %T')" > "$STATE"
echo "OK 部署完成 $OLD -> $NEW；验证通过；上一版快照保留在 .next.prev"
