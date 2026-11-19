/**
 * 站内助手的降级形象：手绘 SVG。
 *
 * 只在 Live2D 初始化失败（模型 404、WebGL 不可用等）时兜底，正常情况看不到。
 * 配色跟随看板娘 Hiyori（浅棕双马尾 + 米色开衫 + 藏青裙 + 蓝丝带），
 * 避免"降级后换了一个人"的割裂感。调用方只依赖 mood 一个入参。
 */

export type Mood = 'idle' | 'thinking' | 'happy';

const SKIN = '#ffe3d3';
const SKIN_DEEP = '#f8cdb9';
const HAIR = '#a98a72';
const HAIR_DEEP = '#8a6d58';
const INK = '#3a2c28';
const DRESS = '#e6d3b3';
const COLLAR = '#2f3a52';
const ACCENT = '#5b73a8';

export function CompanionAvatar({
  mood = 'idle',
  className,
}: {
  mood?: Mood;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 220"
      className={className}
      role="img"
      aria-label="站内助手"
    >
      {/* ── 双马尾（后层） ── */}
      <g className="companion-sway">
        <path
          d="M64 74c-18 8-28 36-23 60 3 13 12 17 17 9 5-9 0-34 12-49z"
          fill={HAIR_DEEP}
        />
        <path
          d="M136 74c18 8 28 36 23 60-3 13-12 17-17 9-5-9 0-34-12-49z"
          fill={HAIR_DEEP}
        />
      </g>

      {/* ── 身体 ── */}
      <path
        d="M78 133h44c7 0 11 4 11 11l-3 50c0 6-4 10-10 10H80c-6 0-10-4-10-10l-3-50c0-7 4-11 11-11z"
        fill={DRESS}
      />
      {/* 手臂 */}
      <ellipse cx="68" cy="168" rx="8" ry="17" fill={SKIN} transform="rotate(-8 68 168)" />
      <ellipse cx="132" cy="168" rx="8" ry="17" fill={SKIN} transform="rotate(8 132 168)" />
      {/* 水手领 */}
      <path d="M82 133l18 16 18-16 7 6-25 22-25-22z" fill={COLLAR} />
      <path d="M100 152l6 8-6 10-6-10z" fill={ACCENT} />

      {/* ── 头 ── */}
      {/* 头发外轮廓 */}
      <ellipse cx="100" cy="86" rx="50" ry="46" fill={HAIR} />
      {/* 脸 */}
      <ellipse cx="100" cy="92" rx="41" ry="38" fill={SKIN} />
      {/* 下巴阴影 */}
      <ellipse cx="100" cy="118" rx="20" ry="6" fill={SKIN_DEEP} opacity="0.35" />

      {/* 刘海：三段弧形，避免出现尖角 */}
      <path
        d="M58 84c0-24 19-42 42-42s42 18 42 42c-9-11-18-14-26-8-7 5-12 4-16-3-4 7-10 9-17 4-8-6-16-4-25 7z"
        fill={HAIR}
      />
      {/* 鬓发 */}
      <path d="M60 82c-6 12-7 26-4 38 2 7 8 6 9-1 1-13 4-25 9-32z" fill={HAIR_DEEP} opacity="0.9" />
      <path d="M140 82c6 12 7 26 4 38-2 7-8 6-9-1-1-13-4-25-9-32z" fill={HAIR_DEEP} opacity="0.9" />

      {/* 呆毛 */}
      <path
        d="M104 46c4-11 12-16 19-14-7 4-11 9-13 17"
        stroke={HAIR}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />

      {/* 发绳 */}
      <ellipse cx="63" cy="76" rx="5" ry="7" fill={ACCENT} transform="rotate(-18 63 76)" />
      <ellipse cx="137" cy="76" rx="5" ry="7" fill={ACCENT} transform="rotate(18 137 76)" />

      {/* ── 五官 ── */}
      <g className="companion-blink">
        <ellipse cx="83" cy="96" rx="8.5" ry="10.5" fill={INK} />
        <ellipse cx="117" cy="96" rx="8.5" ry="10.5" fill={INK} />
        <circle cx="86" cy="92" r="3.1" fill="#fff" />
        <circle cx="120" cy="92" r="3.1" fill="#fff" />
        <circle cx="80" cy="101" r="1.6" fill="#fff" opacity="0.8" />
        <circle cx="114" cy="101" r="1.6" fill="#fff" opacity="0.8" />
      </g>

      {/* 腮红 */}
      <ellipse cx="70" cy="108" rx="6.5" ry="3.6" fill={ACCENT} opacity="0.4" />
      <ellipse cx="130" cy="108" rx="6.5" ry="3.6" fill={ACCENT} opacity="0.4" />

      {/* 嘴 */}
      {mood === 'thinking' ? (
        <ellipse cx="100" cy="112" rx="3.2" ry="3.8" fill={INK} />
      ) : mood === 'happy' ? (
        <path d="M93 109c2 6 12 6 14 0z" fill={INK} />
      ) : (
        <path
          d="M96 111c2 2.6 6 2.6 8 0"
          stroke={INK}
          strokeWidth="1.9"
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* 发夹：三根小柱子，点明"数据分析师" */}
      <g transform="translate(126 62) rotate(-14)">
        <rect x="0" y="9" width="4.5" height="7" rx="1.4" fill={COLLAR} opacity="0.9" />
        <rect x="6.5" y="5" width="4.5" height="11" rx="1.4" fill={COLLAR} opacity="0.9" />
        <rect x="13" y="1" width="4.5" height="15" rx="1.4" fill={COLLAR} opacity="0.9" />
      </g>

      {/* thinking 时的三点 */}
      {mood === 'thinking' && (
        <g fill={ACCENT}>
          <circle cx="150" cy="52" r="2.4" className="companion-dot" />
          <circle cx="158" cy="45" r="3" className="companion-dot" style={{ animationDelay: '160ms' }} />
          <circle cx="167" cy="37" r="3.6" className="companion-dot" style={{ animationDelay: '320ms' }} />
        </g>
      )}
    </svg>
  );
}
