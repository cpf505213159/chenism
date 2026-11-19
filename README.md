# chenism — 个人简历与项目展示站

一个内容型的个人站：首页摘要 + 结构化简历 + 项目列表 + 项目详情 + 站内检索助手。
所有页面在构建期静态生成，唯一的服务端能力是 `/api/ask`（可以被一个环境变量整块关掉）。

设计依据见 `docs/`：

| 文档 | 内容 |
|---|---|
| `docs/01-research-personal-site.md` | GitHub 上 11 个同类站 + 5 个 AI 集成的调研 |
| `docs/02-design-personal-site.md` | 架构设计、数据 schema、任务分解、优化优先级 |
| `docs/03-playbook-content-and-ai-eval.md` | 详情页五段叙事填写手册 + AI 评测集说明 |
| `docs/ai-eval/questions.yaml` | 20 条可跑分的评测题（真实落地版） |

## 快速开始

```bash
pnpm install
pnpm dev                 # http://localhost:3000
pnpm build && pnpm start # 生产构建（默认 3000，可用 -p 改端口）
```

其他命令：

```bash
pnpm check:content   # 内容体检：字段缺失、重复 slug、模糊指标、站内死链
pnpm eval:ask        # 跑 AI 检索评测集（需要服务已启动）
pnpm repos:sync      # 拉取 GitHub 仓库元数据并回填 front matter 快照
pnpm og              # 生成分享卡 PNG 到 public/og/（需要服务已启动）
pnpm print:resume    # 用本机 Chrome 打印 /resume 生成 public/resume.pdf
pnpm shoot           # 各页面截图（视觉验收用）
```

## 改内容：有后台，不用改代码

后台和站点是**同一个地址、同一个端口**，不需要另开一条链接：

```bash
pnpm dev       # 站点 http://localhost:3000，后台也在同一个域下
```

进入方式（两种，都很隐蔽，访客看不出来）：

1. 任意页面按 **Ctrl + Shift + A**（macOS 是 ⌘ + Shift + A）
2. 连点页脚版权行末尾那个看不见的小热区 **3 次**（1.5 秒内）

两种方式都只做一件事：跳到 `/admin`。没登录时会先出登录页。

首次进入需要登录。在项目根目录的 `.env.local` 里配置（该文件已被 git 忽略）：

```bash
ADMIN_USER=admin
ADMIN_PASSWORD=换成你自己的密码   # 至少 6 位
# ADMIN_SECRET=一段足够长的随机串   # 可选；不设则由密码派生
```

未配置密码时登录一律失败（不会退化成空密码）。

三个标签页对应三类内容：**基本信息**（姓名、职位、邮箱、社交链接）、**简历**（概述、工作经历、教育、技能、荣誉）、**项目**（front matter、结果指标、正文 Markdown，支持新建与删除）。

保存后写入 `content/` 下的文件，开发服务器自动刷新，页面立刻能看到效果。**它不生成也不修改任何 TypeScript 代码。**

| 想改什么 | 文件 | 后台位置 |
|---|---|---|
| 姓名、职位、邮箱、社交链接 | `content/data/site.json` | 基本信息 |
| 简历（经历、教育、技能、荣誉） | `content/data/resume.json` | 简历 |
| 项目详情与指标 | `content/projects/<slug>.mdx` | 项目 |
| 设计 token（颜色、字体） | `src/app/globals.css` | 无（需要改代码） |

### 登录是怎么做的

- 账号密码在服务端比对（`timingSafeEqual`，定长比较，不靠字符串相等）。
- 登录成功写一个 **HMAC-SHA256 签名的 httpOnly Cookie**，`SameSite=Strict`，7 天有效；密码或 `ADMIN_SECRET` 一改，旧会话立即全部失效。
- 服务端组件读 Cookie 决定渲染登录页还是编辑器；所有 `/api/admin/*` 写接口再校验一次，避免"页面进得去、接口没拦住"。
- 写接口还做同源校验（比对 `Origin` 与 `Host`），配合 `SameSite=Strict` 挡住跨站提交。
- 登录失败限流：同 IP 五分钟 5 次。

### 后台的边界（有意为之）

- **默认只在开发态可用**：本地 `pnpm dev`（`NODE_ENV != production`）自动放开；生产默认关闭，`/admin` 与 `/api/admin/*` 返回 **404**，页脚入口也不渲染，线上不留任何"这里有后台"的痕迹。
- **生产可显式开启**：设 `ADMIN_ENABLED=1` 即开启（见下方「部署到云服务器」）。`/admin` 与所有 `/api/admin/*` 都是 `force-dynamic`，**运行期**读这个变量，所以先部署、之后在服务器上打开也生效，无需重新 build。开启后仍需登录，`requireAdmin` 会校验会话。
- **不引入数据库**：内容仍然是可写磁盘上的文件（`content/`），可 diff、可回滚。
- **改完即时生效，不用重新发布**：保存后 `invalidateContent()` 会一次性清掉项目缓存、简历缓存、检索索引，并 `revalidatePath` 刷新页面与 `/resume.json`。前台与站内检索立刻读到新内容（详见「在线更新还能被检索命中」）。

### 后台登录在哪

就是**站点自己的 `/admin`**，同一个域名同一个端口，没有独立后台系统：

- 直接访问 `https://你的域名/admin`；
- 或任意页面按 **Ctrl + Shift + A**（macOS ⌘ + Shift + A）；
- 或连点页脚版权行末尾的隐藏热区 3 次。

账号密码取自服务端的 `ADMIN_USER` / `ADMIN_PASSWORD`（`.env.local` 或云服务器的环境变量），未配置密码时登录一律失败。生产环境还需 `ADMIN_ENABLED=1` 才会出现这个入口。

### 想要更强的"多人 / 版本化在线编辑"

当前这套是「单实例 + 本地可写文件」，零成本、零账号、内容完全属于你自己。如果要多人协作或每次改动留 Git 历史，可以再叠 CMS：

1. **Git-based CMS**（Decap / Sveltia）：保存即 commit 触发重新部署，需给 GitHub 配 OAuth。
2. **Headless CMS**（Sanity / Strapi / Contentful）：编辑体验最好，但内容搬出仓库，站点的"可整块删除"特性会变弱。

要换成上面任一条，可以按你的部署方式来接。

新增项目只要放一个 `content/projects/<slug>.mdx`，slug 与文件名一致，构建时会自动生成列表卡、详情页、sitemap 条目与检索索引。

### 项目 front matter 的关键字段

```yaml
metrics:                      # 详情页与卡片的"结果"，method 必填
  - label: 流失预测 AUC
    baseline: 0.69            # 选填；没有同口径旧值就留空
    value: 0.78               # 不能写"显著提升"，构建会报错
    method: 时间外验证，3 个月留出，正负样本 1:4 下采样后还原
    direction: up
repoUrl: https://github.com/you/repo   # 有它才渲染"源码"按钮
repoSnapshot:                 # 构建时拉取失败时的兜底，可提交进仓库
  stars: 128
  language: TypeScript
  updatedAt: 2026-09-28
repoSnapshotAt: 2026-11-01    # 界面会标"截至 X"，避免旧值被当成实时数据
ogTagline: 一句话定位          # ≤24 字，分享卡第 2 行；缺省回落 summary 首句
```

`metrics` 缺失不会让构建失败，但详情页会显式说明"尚未补充可量化结果"——空着也是一条信息。

## 站内助手（悬浮角色）

右下角有一个 Live2D 角色 **Momose Hiyori**（Live2D 官方免费示例模型，Cubism 4 / `.moc3`），点一下展开问答面板，收起后只剩角色本身。它与 `/ask` 页共用同一个检索接口，答案一致。

### 角色配置

| 项目 | 说明 |
|---|---|
| 模型 | `public/live2d/hiyori/`：`.moc3` + 2 张贴图（已降到 1024²）+ 物理 + 10 个动作 |
| 动作 | Idle ×9 + TapBody ×1。自动轮播挑过幅度最大的 4 个 idle（`m02/m05/m03/m06`），避免老是同一个动作 |
| 表情 | 官方示例没带表情文件，`expressions/*.exp3.json` 是自建的三套：`smile` / `think` / `calm`，纯参数叠加 |
| 状态 | 提问中 → `think` + idle 动作；答完 → `smile` + TapBody；2.6 秒后回 `calm` |
| 体积 | 模型 1.8MB + 两个运行时内核 332KB；首次访问实测传输约 1.7MB，之后走缓存，且都在 `requestIdleCallback`（上限 900ms）之后才拉 |

> 站内只保留这一套外观，不提供「换装」入口：Hiyori 官方只有一套衣服，换装需要换角色，没必要为了一个按钮换掉整张脸。

技术选型：

| 选项 | 结论 |
|---|---|
| `l2d-widget`（整包 widget） | 它自己把 canvas fixed 到页面角落，还带菜单和状态条，无法和我们的气泡、问答面板配合 |
| **`l2d` 引擎（选中）** | 只接一个 canvas，不抢 DOM，可以嵌进现有布局；Cubism 2 / 4 自动识别 |
| `live2d-widget`(GPL) | 许可与模型来源都受限，且同样无法嵌入自定义 UI |

资源都在仓库里，不依赖运行时 CDN：

```
public/live2d/live2dcubismcore.min.js   Cubism 4/5 内核（204KB）—— l2d 模块顶层就引用它
public/live2d/live2d.min.js             Cubism 2 运行时（128KB）—— 引擎部分工具函数仍依赖它的全局符号
public/live2d/hiyori/                   模型：moc3、2 张贴图、物理、动作、自建表情（1.8MB）
```

**性能**：模型不进首屏。`l2d` 用运行时 `import()` 加载，两个内核与模型都在 `requestIdleCallback` 之后才拉；首屏 JS 没有增加，LCP 元素仍是文字。

**接入踩过的四个坑**（都已在代码里处理）：

1. Cubism 2/4 两个运行时都得先有：`live2d.min.js` 与 `live2dcubismcore.min.js`。缺了引擎照样"加载成功"、`loaded` 事件照常触发，但**一个像素都不画**。
2. **打包器会弄坏引擎**：`l2d` 被 webpack/turbopack 打进 bundle 后，它内部注入的引导脚本失效，表现是 `csmGetMocVersion` 读到 `undefined`、模型永远停在 loading。现在改成运行时 `new Function('u','return import(u)')` 直接加载 `public/_l2d/index.js`，绕开打包。
3. **引擎持有全局状态**：两个实例同时 `load()` 会互相踩。所有加载/销毁都走 `queueEngine` 串行化。
4. React 开发模式 effect 会跑两次，若复用同一个 canvas，第二次会撞上已销毁的 WebGL 上下文，同样表现为"加载成功但空白"。现在每次挂载都新建 canvas。

> **许可提醒**：`live2d.min.js` 是 Live2D 的专有运行时。Hiyori 是官方免费素材，个人/非商业展示可用；**商用前请读 Live2D Free Material License**，或换成有明确授权的模型。

### 交互

- 点角色（画布任意位置，不必点中身体）展开/收起面板；`ESC` 收起，焦点回到角色按钮。
- 鼠标划过角色会轻轻动一下（4 秒冷却）；每 7~14 秒自动换一个动作。
- 首次访问 6 秒后冒一次气泡（记在 `localStorage`，之后不再打扰）。
- 面板里可以点示例问题，也可以自己输入；结果带出处，点卡片直接跳到项目详情。
- 未命中时明说"站内没有相关内容"，并给出 `完整页` 入口去 `/ask`。
- 输入框在打开时获得焦点（用户主动点开，不算抢焦点）。

### 兼容性与体验

- **不抢首屏资源**：角色在 `requestIdleCallback`（上限 900ms）之后才挂载，避免和 LCP 争带宽。
- **不挡页面操作**：外层是 `pointer-events-none` 的全宽容器，只有角色与面板本身可点。
- **层级**：`z-index: 60`，低于后台弹层（100），不会盖住登录与编辑器。
- **安全区**：底部用 `max(12px, env(safe-area-inset-bottom))`，iPhone 底部横条不压住角色。
- **移动端**：面板变成"可视宽度满宽"的卡片，列表高度限 `46dvh`，不会顶出屏幕。
- **减少动态**：`prefers-reduced-motion: reduce` 时不自动插播动作，只剩引擎自带的呼吸/眨眼（引擎没有 pause API，无法完全静止）。
- **降级**：WebGL 不可用或模型加载失败时，换成同色系的 SVG 头像，面板功能不受影响。
- **打印**：角色带 `.no-print`，打印简历时不会出现在纸上。
- **后台页**：`/admin` 下直接不渲染，避免和编辑器抢注意力。

## AI 模块（`/ask`）

定位是**站内检索**，不是聊天机器人：只回答"这个站里写了什么"，返回带出处的原文片段，检索不到就明说没有。主检索链路是纯 BM25，零模型参与、亚毫秒级。

| `AI_MODE` | 行为 |
|---|---|
| `off` | `/ask` 返回 404，入口不渲染，站点其余功能完全正常 |
| `retrieval`（默认） | BM25 检索，返回 3 条站内摘录 + 链接；零模型、零延迟、零成本 |
| `answer` | 在 `retrieval` 之上，**可选**追加一段基于命中原文的 AI 小结（需配 `DEEPSEEK_API_KEY`） |

**三档的检索部分完全相同**：命中与否只由 BM25 决定，模型不参与召回、不改变排序、不阻塞返回。详见下方「可选 AI 小结」。

实现位置：`src/lib/ai/{chunk,retrieve,guard,summarize}.ts`、`src/app/api/ask/route.ts`、`src/app/api/ask/summarize/route.ts`、`src/app/ask/page.tsx`。

> `AI_MODE` 在**构建期**决定 `/ask` 页面、入口文字链、footer 链接与悬浮角色是否存在；
> 在**运行期**决定接口是否响应。部署时两处请用同一个值，否则会出现"页面在但接口 404"（或反之）。
> 运行期被关掉时，前端会把 404 归一成"站内助手暂时关闭"，而不是误报"站内没有相关内容"。
索引在服务端进程内首次请求时构建（约 40 个块，耗时可忽略），并带内容指纹自动重建，因此不需要额外的构建脚本。

#### 在线更新简历 / 补充内容后，还能被检索命中吗？

能，而且**这正是为云服务器在线更新设计的**，与是否引入模型无关。链路是：

1. 后台保存只写 `content/` 下的文件（`resume.json` / 项目 `.mdx`），不碰代码；
2. `invalidateContent()` 一次清掉三层进程内缓存：项目列表、简历（mtime 缓存）、检索索引，并 `revalidatePath` 刷新页面与 `/resume.json`；
3. 检索索引用**内容 mtime 指纹**兜底：即便外部直接改文件（`git pull`、手动编辑、多个实例），下一次检索发现指纹变化就会自动重建；
4. 简历的 `basics.summary`、各段工作 / 教育 / 技能 / 荣誉，以及每个项目的概览与正文分块都会进索引——后台能改的字段都能被搜到（`chunk.test.ts` 覆盖这条契约）。

所以"在线改一段简介 → 立刻能搜到 → `/resume` 与 `/resume.json` 同步"是闭环的，无需重新 build、无需重新发布、也无需重建向量库。

#### 可选 AI 小结（DeepSeek）

可选接入 DeepSeek 做答案小结，前提是**不能牺牲检索速度**。这里的取舍是：

- **命中靠 BM25，不靠模型**。引入向量库反而会拖慢速度，并制造"内容改了但向量没重建"的新不一致——恰好会破坏上面的在线更新闭环。
- 因此模型只做**命中之后的文字润色**：把已命中的 3 条站内原文归纳成一段速读小结，不引入外部知识、不参与召回。
- **默认完全关闭**：`AI_MODE=retrieval`（默认）或未配 `DEEPSEEK_API_KEY` 时，零模型调用、零额外延迟。
- **异步、非阻塞**：主 `/api/ask` 只多返回一个 `enhance` 标记，原文摘录立即渲染；前端再 fire-and-forget 调独立的 `/api/ask/summarize`，小结到了才叠加。检索耗时里不含任何模型时间。
- **严格超时 + 静默回退**：`DEEPSEEK_TIMEOUT_MS`（默认 2500ms）超时、限流、网络错、空返回，一律视为"这次没有小结"，已展示的原文完全不受影响。
- **证据只来自站内**：小结端点只收 `q`，服务端自己重新 `retrieve`，不信任前端传来的"证据"，杜绝伪造内容注入；秘钥只在服务端环境变量，硬编码零容忍。

开启方式（云服务器环境变量）：

```bash
AI_MODE=answer
DEEPSEEK_API_KEY=sk-你的秘钥
# 可选：DEEPSEEK_MODEL=deepseek-chat  DEEPSEEK_TIMEOUT_MS=2500
```

`summarize.test.ts` 覆盖：默认关闭、需 key 才启用、grounded 提示词、超时/异常/非 2xx/空内容一律回退，以及"站内没命中就不调模型"。

**当前实测（`pnpm eval:ask`）**：hit@3 **100%**（15/15）、边界拒答 **80%**（4/5）。

剩下的那条是结构性限制，不是调参能解决的：

`有没有做过实时数仓` → 命中了 `ecom-segment` 与 `bi-metrics`。站内确实出现过「实时」这个词——但语境是**「分层不做实时，T+1 就够」这种否定句**；也确实有「数仓」，只是离线的。BM25 是词袋模型，对**否定与限定**完全无感。

主链路只返回摘录、不做生成，所以它不会真的说出「做过实时」——真正的问题是**它把一句否定当成相关内容返回**，用户得自己读完整句才明白答案是「没有」。要系统自己判断"这句是在否认"，需要语义级的句子理解：这已经超出关键词检索的范畴，也不是当前的 grounded 小结能解决的（小结只能改写命中的原文，不改变召回）。

（另一个坑：评测脚本连发 20+ 次请求会触发限流，429 的返回看起来和「没有命中」一样。脚本现在会直接中止并提示用 `ASK_IP_LIMIT=200` 启动服务。）

调优过程中真正有效的三步（也是可复用的经验）：

1. **按项目聚合打分**，而不是让同一项目的多个正文块互相竞争 top-3。
2. **让内容说人话**：简历里原本没有「学校 / 毕业 / 上一家公司」这些提问者的措辞，召回永远是 0。
3. **别把「技术栈」这种词复制到每个块里**——它在索引里的文档频率会接近 100%，idf 趋零，反而搜不到。

> 需要诚实说明：这份评测集同时被用来调过阈值、同义词与切块方式，它现在已经是 dev set，不再是无偏测试集。要评估"否定/限定"这类语义能力，应当补一批**从未参与调参**的新题。

## 一个彩蛋

首页按 **Shift + D**（在输入框里打字不会触发），会展开「本站数据快照」：项目数、指标条数、正文总字数、技术栈出现频次——数据来自站点自己的内容文件，构建时算好。

打开浏览器控制台也能看到同样的一份 ASCII 条形图。默认完全不可见，不影响任何正常操作。

## 性能、可访问性与安全

- 内容页（`/resume`、`/projects/[slug]`）客户端 JS 只有主题切换、导航高亮和悬浮角色三块；角色代码与模型都在 `requestIdleCallback` 之后才加载，不占首屏。
- 首屏无 3D / canvas / 视频；封面是由 slug 确定性生成的 SVG，零图片请求、无 CLS。
- 全站图片（如将来加真实截图）走 `next/image` + AVIF，封面预算 ≤150KB。
- 尊重 `prefers-reduced-motion`（角色不再自动插播动作，引擎基础呼吸保留）；`focus-visible` 环、跳转正文链接、320px 不横滚、`@media print` 单独适配。
- 安全响应头：`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy`（在 `next.config.ts` 的 `headers()` 里）。**没有上 CSP**：页面有主题初始化的内联脚本与 JSON-LD，上 CSP 需要 nonce 化，改动面大于收益，暂时不做。
- `/ask` 限流为进程内计数，带过期清理；单实例有效。

## 部署

### 部署到云服务器（支持在线更新简历 / 内容）

`/ask` 与在线后台都需要 **Node 常驻进程 + 可写文件系统**，所以目标是 `pnpm build && pnpm start`（或 PM2 / systemd / Docker 常驻），不是静态托管。

```bash
# 1. 构建（AI_MODE 在这个阶段决定页面/入口是否存在，需与运行期一致）
pnpm build

# 2. 运行期环境变量（写进 systemd Environment / .env.production / 进程管理器）
SITE_URL=https://你的域名          # 必填，否则 canonical/sitemap 静默指向 localhost
AI_MODE=retrieval                 # 或 answer（配了 DEEPSEEK_API_KEY 才有小结）
ADMIN_ENABLED=1                   # 关键：生产显式开启后台
ADMIN_USER=admin
ADMIN_PASSWORD=换成强密码          # 至少 6 位
ADMIN_SECRET=一段稳定的长随机串     # 强烈建议设，避免改密码使会话全失效
# DEEPSEEK_API_KEY=sk-...         # 仅 AI_MODE=answer 时需要

# 3. 常驻启动
pnpm start                        # 监听 3000，前面挂 Nginx 反代 + HTTPS
```

要点：

- **登录位置**：`https://你的域名/admin`（或页面按 Ctrl + Shift + A）。入口由运行期 `ADMIN_ENABLED` 决定，先部署再开也生效。
- **务必用 HTTPS**：登录 Cookie 是 `httpOnly + SameSite=Strict`，`secure` 标志按协议自动加；HTTP 下Cookie 仍可用但传输不加密。配好 Nginx 的 `X-Forwarded-For` / `X-Forwarded-Proto`，限流按客户端真实 IP 计。
- **内容必须持久化**：`content/` 目录要落在可写磁盘或持久卷上，且**单实例运行**——三层缓存是进程内的，多实例各自缓存不会互通（要横向扩容就得把缓存换成共享存储）。
- **在线更新即时生效**：后台保存 → 清缓存 + 重建索引 + `revalidatePath`，前台与检索立即读到新内容，无需重启、无需重新 build（详见「在线更新还能被检索命中」）。
- **无模型默认零成本**：不配 `DEEPSEEK_API_KEY` 就是纯 BM25，检索速度与命中率不受任何影响；配了也只是异步追加小结。
- 分享卡与 PDF 是构建/本机产物：改完内容后如需更新，重跑 `pnpm og` / `pnpm print:resume` 并提交产物；这不影响在线内容的即时可见性。

### 一键更新 / 回滚（生产服务器）

当前生产部署约定：

| 项 | 值 |
|---|---|
| 项目目录 | `/opt/chenism`（`git clone` 自本仓库，分支 `main`） |
| 依赖 | Node 22 + `pnpm install --frozen-lockfile` |
| 运行端口 | `3100`，**仅监听 `127.0.0.1`** |
| 进程管理 | PM2 应用 `chenism`（`ecosystem.config.cjs`），`pm2-root.service` 开机 `resurrect` |
| 对外入口 | Nginx `conf.d/chenism.conf` 按 `server_name chenism.dev` 反代到 3100；80 端口上其他站点不受影响 |
| 环境变量 | `/opt/chenism/.env.local`（`chmod 600`，不进 Git） |
| 日志 | `/opt/chenism/logs/{pm2-out,pm2-err,deploy}.log` |

**日常更新**：

```bash
# 本地：改完代码后
git add -A && git commit -m "..." && git push

# 服务器：一条命令
cd /opt/chenism && bash scripts/deploy.sh
```

脚本流程：同步代码 → **保护并恢复 `content/`** → 装依赖 → 在 `/opt/.chenism-staging`
**隔离构建**（全程不触碰运行中的 `.next`，构建失败线上零影响）→ 原子替换产物 +
`pm2 restart`（**停机约 3–5 秒**）→ 健康检查。

**验证方式**（脚本每次自动执行，也可手动）：

```bash
bash scripts/deploy.sh --status                 # 当前 commit / 快照 / 健康状态
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: chenism.dev' http://127.0.0.1/
curl -s -X POST -H 'content-type: application/json' \
  -d '{"q":"指标口径是怎么统一的"}' http://127.0.0.1:3100/api/ask
curl -s -D - -o /dev/null http://127.0.0.1:3100/resume.json | grep -i cache-control
```

四项自动检查：首页 200、`/resume.json` 为 `no-store`、`/api/ask` 返回 `ok:true`、Nginx 反代链路 200。

**异常处理**：

| 情况 | 行为 |
|---|---|
| git 拉取 / 依赖 / 构建失败 | 在切换前退出，**线上完全不受影响**（`.next` 未动） |
| 切换后健康检查失败 | 自动用 `.next.prev` 回滚并重启，无需人工 |
| 并发执行 | `flock` 锁拒绝第二个任务 |
| 磁盘不足 1G | 预检拦截 |
| 回滚后仍不健康 | 日志指向 `pm2 logs chenism` 与 `logs/deploy.log`，需人工介入 |

**回滚**：`bash scripts/deploy.sh --rollback` 秒级切回上一版构建并重新验证。
它交换 `.next` 与 `.next.prev`，所以再执行一次会切回当前版本。每次部署只保留最近一版快照。

**两个边界**：

1. `content/` 以服务器后台数据为准——脚本默认恢复它，因此**代码走 Git、内容走 `/admin`**。
   确需用仓库内容覆盖服务器内容时用 `--sync-content`（会覆盖后台改过的简历/项目，慎用）。
2. 三层缓存是**进程内单实例**，横向扩容需换共享存储。

### Vercel（Serverless，可展示但**不适合在线编辑**）

1. 导入仓库，框架自动识别为 Next.js。
2. 环境变量：`SITE_URL`、可选 `GITHUB_TOKEN`；`AI_MODE` 构建期与运行期保持一致。
3. 部署前在本地跑一次 `pnpm print:resume` 并把 `public/resume.pdf` 提交进仓库。

> Vercel 的文件系统**只读**，后台写入不会持久化，因此不要设 `ADMIN_ENABLED=1`。它适合"内容随代码一起发布"的模式；要在线编辑请用上面的云服务器方案。

### 纯静态托管（GitHub Pages / Cloudflare Pages）

```bash
AI_MODE=off pnpm build
```

此时 `/api/ask` 不存在、`/ask` 返回 404，其余页面完全正常。这就是"AI 可整块删除"的含义。

## 目录结构

```
content/projects/*.mdx        项目详情（唯一叙事来源）
content/data/                 site.json、resume.json（后台在线编辑的就是这两个）
src/app/                      路由（/ resume projects/[slug] ask admin api/ask api/ask/summarize api/admin/* sitemap robots）
src/components/               layout / project / resume / ai / ui / companion（悬浮角色）
src/lib/content/              schema(zod) + repository + mdx 编译 + invalidate(缓存失效)
src/lib/ai/                   chunk / retrieve(BM25) / guard(限流与开关) / summarize(可选小结) / client
src/lib/admin/                auth(签名会话) / guard(准入) / store(文件读写)
src/lib/github/               仓库元数据读取与三层降级
src/data/                     site.ts（站点常量）、resume.ts（运行时读文件 + mtime 缓存）
scripts/                      check-content / fetch-repos / eval-ask / print-resume / shoot
public/live2d/                角色资源：hiyori、两个运行时内核、四个调试页（生产环境 404）
docs/                         调研、设计、叙事手册、评测集
.cache/github-repos.json      仓库元数据缓存（由脚本写入，可提交）
```

## 说明

`src/data/site.ts`、`src/data/resume.ts` 与 `content/projects/*.mdx` 中的内容是为演示站点结构而写的示例资料，请替换为你自己的真实经历。项目指标与公司名已按脱敏口径处理。
