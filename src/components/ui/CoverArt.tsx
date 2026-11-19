/**
 * 程序化封面：按 slug 稳定生成，不依赖任何图片资源。
 * 好处是没有 8MB 首屏图、没有版权问题、亮暗主题自动适配；代价是不能展示真实截图。
 * 需要真实截图时，在 front matter 里补 cover 字段即可覆盖这一层。
 *
 * 设计约束：图形一律水平轴对齐，不做整体旋转——柱状图斜着看就是 bug，不是风格。
 */

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** 确定性伪随机：同一 slug 每次渲染结果一致 */
function rng(seed: number) {
  let state = seed % 233280;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

const PAD_L = 76;
const PAD_R = 76;
const BASE_Y = 300;
const TOP_Y = 82;

export function CoverArt({
  seed,
  title,
  index,
  className,
}: {
  seed: string;
  title: string;
  index?: string;
  className?: string;
}) {
  const h = hash(seed);
  const motif = h % 4;
  const next = rng(h);

  const W = 640;
  const plotW = W - PAD_L - PAD_R;

  return (
    <svg
      viewBox="0 0 640 360"
      role="img"
      aria-label={`${title} 的抽象数据图形封面`}
      className={className}
      preserveAspectRatio="xMidYMid slice"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <rect width="640" height="360" fill="var(--surface-2)" />

      {/* 图纸式横向基线 */}
      <g stroke="var(--line)" strokeWidth="1">
        {[60, 120, 180, 240, 300].map((y) => (
          <line key={y} x1="0" y1={y} x2="640" y2={y} />
        ))}
      </g>

      {/* 1｜柱状图：所有柱子共享同一基线 */}
      {motif === 0 && (
        <g>
          {Array.from({ length: 11 }).map((_, i) => {
            const barW = plotW / 11 - 8;
            const height = 26 + next() * (BASE_Y - TOP_Y - 26);
            return (
              <rect
                key={i}
                x={PAD_L + i * (barW + 8)}
                y={BASE_Y - height}
                width={barW}
                height={height}
                fill="var(--accent)"
                opacity={0.3 + (i % 4) * 0.16}
              />
            );
          })}
          <line
            x1={PAD_L - 8}
            y1={BASE_Y}
            x2={W - PAD_R + 8}
            y2={BASE_Y}
            stroke="var(--line-strong)"
            strokeWidth="1"
          />
        </g>
      )}

      {/* 2｜折线 + 面积：一条带趋势的序列 */}
      {motif === 1 && (
        <g>
          {(() => {
            const n = 9;
            const step = plotW / (n - 1);
            let level = 0.42;
            const pts = Array.from({ length: n }).map((_, i) => {
              level = Math.min(0.86, Math.max(0.12, level + (next() - 0.42) * 0.3));
              return {
                x: PAD_L + i * step,
                y: BASE_Y - level * (BASE_Y - TOP_Y),
              };
            });
            const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
            const area = `M ${pts[0].x} ${BASE_Y} L ${line.replace(/ /g, ' L ')} L ${pts[pts.length - 1].x} ${BASE_Y} Z`;
            return (
              <>
                <path d={area} fill="var(--accent)" opacity="0.1" />
                <polyline
                  points={line}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {pts.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--accent)" />
                ))}
                <line
                  x1={PAD_L - 8}
                  y1={BASE_Y}
                  x2={W - PAD_R + 8}
                  y2={BASE_Y}
                  stroke="var(--line-strong)"
                  strokeWidth="1"
                />
              </>
            );
          })()}
        </g>
      )}

      {/* 3｜散点 + 拟合线：相关性 */}
      {motif === 2 && (
        <g>
          {Array.from({ length: 26 }).map((_, i) => {
            const x = PAD_L + next() * plotW;
            const noise = (next() - 0.5) * 92;
            const trend = BASE_Y - ((x - PAD_L) / plotW) * (BASE_Y - TOP_Y - 20);
            return (
              <circle
                key={i}
                cx={x}
                cy={Math.min(BASE_Y - 6, Math.max(TOP_Y, trend + noise))}
                r={i % 5 === 0 ? 3.4 : 2.4}
                fill="var(--accent)"
                opacity={0.28 + next() * 0.5}
              />
            );
          })}
          <line
            x1={PAD_L}
            y1={BASE_Y - 18}
            x2={W - PAD_R}
            y2={TOP_Y + 24}
            stroke="var(--line-strong)"
            strokeWidth="1.4"
            strokeDasharray="6 5"
          />
          <line
            x1={PAD_L - 8}
            y1={BASE_Y}
            x2={W - PAD_R + 8}
            y2={BASE_Y}
            stroke="var(--line-strong)"
            strokeWidth="1"
          />
        </g>
      )}

      {/* 4｜构成条：把 100% 拆成几段 */}
      {motif === 3 && (
        <g>
          {(() => {
            const parts = [0.38, 0.24, 0.18, 0.12, 0.08].map((v, i) => ({
              v,
              i,
            }));
            let x = PAD_L;
            const barW = plotW;
            const barY = BASE_Y - 74;
            return (
              <>
                {parts.map(({ v, i }) => {
                  const w = v * barW;
                  const rect = (
                    <rect
                      key={i}
                      x={x}
                      y={barY}
                      width={Math.max(0, w - 2)}
                      height="56"
                      fill="var(--accent)"
                      opacity={0.22 + i * 0.16}
                    />
                  );
                  x += w;
                  return rect;
                })}
                {/* 刻度线，让它读起来像图表而不是色块 */}
                {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                  <line
                    key={t}
                    x1={PAD_L + t * barW}
                    y1={barY + 56}
                    x2={PAD_L + t * barW}
                    y2={barY + 68}
                    stroke="var(--line-strong)"
                    strokeWidth="1"
                  />
                ))}
                <line
                  x1={PAD_L}
                  y1={barY + 74}
                  x2={PAD_L + barW}
                  y2={barY + 74}
                  stroke="var(--line-strong)"
                  strokeWidth="1"
                />
              </>
            );
          })()}
        </g>
      )}

      {/* 图录编号 */}
      <g fill="var(--faint)" style={{ fontFamily: 'var(--font-mono)' }}>
        <text x="26" y="334" fontSize="10.5" letterSpacing="2">
          {index ? `CASE ${index}` : 'CASE'}
        </text>
      </g>
    </svg>
  );
}
