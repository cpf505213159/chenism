# 个人简历 / 项目展示网站 —— GitHub 同类产品调研报告

> 调研人：许清楚（产品经理）｜日期：2026-11-17｜输出语言：简体中文
> 调研目标：为「简历 + 项目列表 + 项目详情 + GitHub 跳转 + 预留 AI」的个人站提供可核验的事实依据

---

## 0. 一句话结论

GitHub 上**高 star 的个人站模板绝大多数是"单页宣传册"**（hero → about → experience → projects → contact），**普遍没有独立项目详情页、没有可量化叙事、没有 AI**——而这三块恰好是我们需求里最有价值的部分。结论：不要 fork 一个模板，而是**借它的数据层思路（单一数据源 + Markdown）、放弃它的单页形态**。

---

## 1. 调研范围与方法

**方法**：三组关键词并行检索，交叉核对。

| 关键词组 | 目的 |
|---|---|
| `developer-portfolio template` / `portfolio-website` (GitHub topics) | 摸清模板品类的主流形态与 star 量级分布 |
| `next.js portfolio template` / `react portfolio template` 2026 综述 | 获取第三方横评（技术栈、维护状态、卖点） |
| `portfolio RAG chatbot` / `chat with my resume` / `JSON Resume` | 专查 AI 模块现状与简历数据标准 |

**筛选与核实口径**：优先选「有线上 demo + 近两年有提交 + 内容组织方式可辨认」的项目，已归档/停更的保留并标注（其**架构思路**仍被大量 fork）；star 数取自 GitHub topic/仓库页在 2026-11-17 的快照，统一写「≈」，**只用于量级判断而非精确排序**（聚合站间有 ±5% 漂移）；未能直接核实的内容（某仓库 `src/pages` 的具体路由、某站 AI 实现细节）一律标注「未完全核实」。

---

## 2. 候选清单与对比

### 2.1 模板 / 真实个人站（11 个）

| 项目 | Star(≈) | 技术栈 | 内容组织 | 页面结构 | 亮点 | 明显短板 |
|---|---|---|---|---|---|---|
| [alshedivat/al-folio](https://github.com/alshedivat/al-folio) | 16.4k | Jekyll + Liquid | Markdown 集合 + `_data` + `cv.yml` / `resume.json`，论文走 BibTeX | 多路由：about / blog / **projects（独立 collection，天然有详情页）** / cv / publications / repositories | 项目是 Jekyll collection（列表+详情）；CV 可由 RenderCV 或 **JSON Resume** 生成；Ctrl+K 全文搜索；亮暗双主题跟随系统；OG + schema.org；README 直接挂 Lighthouse 徽章 | 学术气质重（论文/教学/书籍），实习/竞赛/产品型项目表达能力弱；Jekyll 生态与前端主流技术栈脱节 |
| [academicpages/academicpages.github.io](https://github.com/academicpages/academicpages.github.io) | 17.8k | Jekyll + Markdown | 纯 Markdown + YAML front matter | 多路由：about / cv / publications / portfolio / teaching / blog | 内容维护零代码，GitHub Pages 一键部署，是"改内容不改代码"最彻底的样本 | 视觉与交互接近 2015 年，无动效无筛选；项目页信息密度低（标题+一段话） |
| [cobiwave/simplefolio](https://github.com/cobiwave/simplefolio) | 14.2k | React + Parcel + SCSS | 数据硬编码在组件/常量里 + 本地图片 | **单页 4 区块** | 极简、star 最高的"入门级"参考，学习样本极多 | **无项目详情页**、无 PDF 简历、数据与 JSX 耦合，改内容=改组件 |
| [timlrx/tailwind-nextjs-starter-blog](https://github.com/timlrx/tailwind-nextjs-starter-blog) | 10.6k | Next.js + MDX + Tailwind | MDX 文件 + front matter | 多路由：blog / tag / about | **SEO 做得最完整**：每页 metadata、JSON-LD（BlogPosting）、自动 sitemap/RSS、自动 og 图；分析工具靠一个环境变量切换 | 本质是博客骨架：没有简历结构、没有项目结构，作品集得自己搭 |
| [bchiang7/v4](https://github.com/bchiang7/v4) | 8.2k | Gatsby + styled-components | `content/` + 前端配置；`static/` 里直接放 resume.pdf | **单页 + 左侧固定社交栏锚点导航** | 全网被模仿最多的设计（navy+green 配色、侧栏社交导航已成品类标配）；PDF 简历直接可下载 | 项目以卡片内联展示、跳外链，未见独立项目详情路由（未完全核实 `src/pages`）；Gatsby 已非主流；2023 年后停更 |
| [saadpasta/developerFolio](https://github.com/saadpasta/developerFolio) | 6.7k | React (CRA) + Lottie | `portfolio.js` 单配置文件 + **GitHub API 拉开源仓库** | 单页：hero / about / experience / projects / contact | 经历、技能、教育、大项目全配置化；开源项目区用 GitHub API 自动取仓库与 star | README 明确声明「不再维护」（最后提交 2024-12）；CRA 技术栈过时 |
| [soumyajit4419/Portfolio](https://github.com/soumyajit4419/Portfolio) | 6.5k | React + 自建 Express 后端 | 配置 + 后端数据库 | 单页 + 博客 | 少见的「自带博客 CRUD」样本 | 为了博客引入服务端与数据库，个人静态站性价比极低 |
| [RyanFitzgerald/devportfolio](https://github.com/RyanFitzgerald/devportfolio) | 5.0k | Astro + Tailwind v4 + TS | **单一 `src/config.ts`** | **单页**：hero / about / projects / experience / education | 空板块自动隐藏（删掉 skills 字段整块消失）；经历卡片之间画连接线成时间线；Astro 默认零 JS，性能好 | **无项目详情页**（`src/pages` 只有 index）；**无 PDF 简历**；README 未提无障碍 |
| [vivek9patel.github.io](https://github.com/vivek9patel/vivek9patel.github.io) | 4.3k | Next.js + Tailwind | 硬编码（模拟一个 Ubuntu 桌面文件系统） | 单页「假装是 Ubuntu 20.04」 | 记忆点极强、传播性强 | **内容是表演**：简历/项目被藏在"应用图标"和"文件夹"后面，招聘方要探索才能找到信息；移动端与可访问性天然吃亏 |
| [arifszn/gitprofile](https://github.com/arifszn/gitprofile) | 2.3k | React + TS + GitHub API | **只填 GitHub username，全站内容由 API 渲染** | 单页：profile / repos / skills / blog | 零维护，star 数、语言、更新时间永远是最新的 | 无法手写项目叙事（没有"我做了什么、为什么这么做"）；站点信息量完全取决于 GitHub 主页质量 |
| [mldangelo/personal-site](https://github.com/mldangelo/personal-site) | 1.7k | Next.js 静态导出 + TS + Tailwind | `src/data/` **类型化数据** + `content/` Markdown | 多路由：home / about / **resume** / **projects** / writing | 工程完整度最高：简历可打印且**同时发布为 JSON Resume**；自动生成分享卡与 `llms.txt`；适配 320px 屏 / 200% 字号 / 高对比模式；CI 检查死链与草稿泄漏；默认零追踪 | star 少（是"个人站"不是模板），拿来用需要裁剪 |

### 2.2 AI 集成案例（5 个，全部为 2025–2026 的个人自建）

| 案例 | 规模 | 技术实现 | 做成什么样 | 暴露的问题 |
|---|---|---|---|---|
| [kelwu.com AI Chatbot](https://kelwu.com/ai-chatbot-rag-for-porfolio) | 350+ 内容片段 | WordPress + Supabase pgvector + gte-small（库内 embedding）+ Claude Haiku 4.5；向量检索 + 全文检索排名融合，取 top 12，回答附来源链接 | v2 做得相当克制专业，明确"只从检索到的内容回答，不知道就说不知道" | **v1 的失败被作者完整写下来了**：同步逻辑跳过已见页面 → 内容改了机器人不知道；新内容没生成 embedding → 每个问题都把约 **95,000 字符**整个知识库塞进 prompt；prompt 又禁止它承认"不知道" → **自信地把项目说串**。这三条是同类产品的通病 |
| [sbtl.dev（thesubtleties/portfolio-ai-assistant）](https://forge.dotclear.watch/thesubtleties/portfolio-ai-assistant) | 164 commits | Astro 5.1 + React 19 + FastAPI + Postgres/pgvector + Redis + OpenAI/Gemini，自托管 K3s + CI/CD | 聊天式 RAG，流式输出 + 角色动画 | 一个"聊天框"把静态站**拖成了分布式系统**（后端、向量库、缓存、容器、SSL）；对个人站的投入产出比极低 |
| [Mrigank005/Portfolio](https://git.codeproxy.net/Mrigank005/Portfolio) | 小型 | React Vite + FastAPI + Gemini 2.5 Flash Lite + Pinecone | 桌面侧栏 / 移动底部抽屉两套交互，流式打字机效果 | **冷启动**：作者专门实现"健康探针"在站点加载时唤醒 serverless 后端——说明访客第一次提问必然要等；两套交互也放大了移动端复杂度 |
| [vetrinanda/MyPersonalPortfolio](http://onlybits.org/vetrinanda/MyPersonalPortfolio) | 小型 | React + FastAPI + SQLite + RAG | 文档直接写"把 resume.pdf 放进去，机器人就会用它回答" | 单文件知识源 → 答案边界极窄，问稍微具体一点就无内容可检索；必须自备 LLM Key 才能跑 |
| [JSON Resume 注册表（AI 部分）](https://registry.jsonresume.org/thomasdavis) | 组织 ≈8.7k（`resume-cli` 4.7k、`resume-schema` 2.4k） | Next.js + Postgres + 自建 embedding；简历 embedding × Hacker News 招聘帖混合检索 + LLM 重排；另提供 MCP server 与 Claude Code skill | **AI 是"找工作"这个具体任务的工具**，不是聊天框；带 gold-set 评测集，P@5 从 0.2 提到 0.8 | （作者自述，未独立核实）能力越强，越依赖非静态基础设施 |

> 说明：本站后来加了「站内助手」——右下角悬浮的 Live2D 角色。它只是交互外壳，既不做检索也不做生成，不引入任何后端；上表反对的是「为角色动画把静态站拖成分布式系统」，不是角色本身。

> 补充证据：dev.to 上已有作者把「Chat with my resume」做成模板在 Lemon Squeezy 售卖（[原文](https://dev.to/okasputra/stop-sending-static-resumes-how-i-built-a-chat-with-my-resume-bot-nextjs-rag-4kdm)），说明这个形态已进入"套壳商品化"阶段——**差异化空间不在"有没有聊天框"，而在"回答得准不准"**。

**关键事实**：上面所有 AI 案例都是"个人自建 + 需要后端 + 需要模型 Key +（多数）需要向量库"。而 star 最高的 5 个模板（al-folio 16.4k、academicpages 17.8k、simplefolio 14.2k、timlrx 10.6k、v4 8.2k）的**功能列表里没有任何 AI**。即：**AI 至今不是个人站的标配，而是少数人的加装件。**

---

## 3. 常见页面结构归纳

### 3.1 导航项与区块顺序

| 出现频次 | 区块 | 说明 |
|---|---|---|
| 几乎 100% | Hero（姓名 + 一句话定位 + 头像） | 决定"5 秒内能不能对上号" |
| 约 90% | About / 自我介绍 | 常与 Hero 合并 |
| 约 85% | Experience / Work（**时间线或卡片流**） | 多数为倒序，含公司、职位、起止、2–4 条 bullet |
| 约 85% | Projects | 3–6 个卡片；**卡片通常只有图 + 标题 + 一句简介 + 技术标签 + 外链** |
| 约 60% | Skills（标签云或分组列表） | 常以 "marquee 滚动" 形式出现（开发者Folio、said7388 等） |
| 约 55% | Education | 少数合并进 Experience 时间线 |
| 约 40% | Contact / Footer（邮箱 + 社交图标） | 一半用 mailto，一半接 EmailJS/Formspree |
| 约 30% | Blog / Writing | 有博客的站点几乎都用 MDX/Markdown |
| 约 20% | 荣誉 / 证书 / Publications | 学术向模板（al-folio、academicpages）才完整具备 |
| 约 15% | Resume/CV 页或 PDF 下载 | bchiang7/v4、al-folio、mldangelo 有；devportfolio 明确没有 |

### 3.2 两种主流形态

- **形态 A：单页锚点（主流，7/11）** — simplefolio、devportfolio、v4、developerFolio、masterPortfolio、gitprofile、vivek9patel。优点：一次滚动讲完、实现快。代价：**内容一多就是超长滚动条**；无法承载"一个项目的完整故事"；分享单个项目只能给外链。
- **形态 B：多路由（4/11）** — al-folio、academicpages、timlrx、mldangelo。内容型站点必然走这条路，因为**每篇内容需要自己的 URL、SEO 元数据与分享卡**。

> "项目列表页 + 项目详情页"是硬要求，**实际上已经把我们推到形态 B**（或 A+B 混合：首页单页摘要，简历/项目走多路由）。这是本次调研对形态选择最直接的结论。

### 3.3 简历呈现方式对比

| 方式 | 代表 | 可扫读性 | 维护成本 | 备注 |
|---|---|---|---|---|
| 时间线（Timeline） | devportfolio（卡片间连线）、Naman Barkiya 模板（可展开） | 高 | 低 | 最适合"经历/教育"这类有序数据 |
| 卡片 + bullet | developerFolio、v4 | 中高 | 低 | bullet 若写成"负责 X"就废了，要写成"做了什么 → 带来什么结果" |
| 技能条 / 进度条 | 大量 Bootstrap 时代模板 | 低（伪精确） | 低 | 反模式：自评 80% 无信息量 |
| PDF 下载 | bchiang7/v4（`static/resume.pdf`）、mldangelo（可打印 + JSON Resume） | — | 中 | **招聘方真实需要**，不能只给网页 |
| JSON Resume 数据源 | al-folio（`resume.json`/`cv.yml`）、mldangelo | — | 低（一次写多端渲染） | 标准开放、227 个社区主题、`resume-cli` 可导出 PDF/HTML/MD |

### 3.4 内容组织方式（决定长期维护成本）

- **配置化**（devportfolio `config.ts`、developerFolio `portfolio.js`）：最省事，但字段僵硬、写不了长文。
- **Markdown/MDX**（al-folio `projects` collection、timlrx）：内容与代码解耦，适合详情页。
- **类型化 data + Markdown 混合**（mldangelo）：工程最规范，CI 可校验死链与草稿。
- **GitHub API 全自动**（gitprofile、al-folio `/repositories`）：零维护，但**只有元数据没有叙事**。

---

## 4. 可借鉴功能清单（按价值排序）

| # | 功能 | 谁真的做了 | 实现成本 | 对我们的建议 |
|---|---|---|---|---|
| 1 | **单一内容源 / 数据与展示分离** | devportfolio、developerFolio、al-folio、mldangelo | 低 | **必做**。项目详情用 Markdown+front matter，列表/简历用类型化 data |
| 2 | **Markdown 驱动的项目详情** | al-folio（collection）、timlrx（MDX） | 中 | **必做**，这是"详情页"的可持续前提 |
| 3 | **时间线式经历** | devportfolio（连接线）、multiple | 低 | 必做，简历页主视图 |
| 4 | **PDF 简历下载** | v4、mldangelo、al-folio | 低 | 必做，预生成而非浏览器打印 |
| 5 | **亮/暗主题跟随系统 + 记忆** | al-folio、mldangelo、devportfolio | 极低 | 必做 |
| 6 | **SEO + 分享卡（metadata / og:image / JSON-LD / sitemap）** | timlrx（最完整）、mldangelo（自动生成分享卡 + llms.txt） | 中 | 必做，尤其"项目详情页被单独分享"的场景 |
| 7 | **GitHub API 补 star / 语言 / 最后更新** | gitprofile（整站）、developerFolio（开源区）、al-folio（`/repositories`） | 中 | 值得做，**但必须构建时拉取 + 缓存 + 失败降级** |
| 8 | **项目标签筛选 / 关键词过滤** | Varunyadavgithub/Portfolio（README 明确 category filter + search，小项目，仅作功能存在性证据） | 低 | 值得做（纯前端，数据里已有 stack 字段） |
| 9 | **全文搜索（Ctrl+K）** | al-folio | 中 | 值得做（项目 ≥10 个之后才有意义） |
| 10 | **访问统计** | al-folio（多 provider + GDPR 同意门）、mldangelo（默认零追踪） | 低 | 值得做，选无 cookie 方案 |
| 11 | **博客 / 笔记区** | timlrx、al-folio、soumyajit4419 | 中 | 可做，复用详情页渲染管线则成本很低 |
| 12 | **多语言 i18n** | Ryan Balieiro 模板（以 i18n 为唯一卖点 → 恰恰说明稀有） | 高 | **不要做**（除非确定投海外岗） |
| 13 | **首屏重型动效 / Three.js / 桌面模拟** | vivek9patel（Ubuntu 模拟 4.3k）、若干 3D 站 | 高 | **不要做**，见 5.4 |
| 14 | **命令面板（Cmd+K 动作面板）** | 个人站里极少见（al-folio 的 Ctrl+K 只是搜索） | 中高 | 不做，收益不匹配 |

---

## 5. 共性不足与痛点（9 条，逐条挂证据）

**5.1 同质化严重，"模板味"是第一观感。**
`Evavic44/portfolio-ideas`（6.4k star）本质是"上百个同结构站点的皮肤合集"；`bchiang7/v4` 的设计被 fork 成数千个站点，作者专门写了一段"请勿抄袭、请注明出处"——**一个设计需要公开请求署名，说明复制规模已经失控**。招聘方看到第 20 个"深色 + 渐变 + 打字机动效 + 三卡片"的站点时，已不再从中读取信息。

**5.2 项目详情页普遍缺失，或极其稀薄。**
11 个候选里 **7 个完全没有独立项目详情路由**（simplefolio、devportfolio、v4、developerFolio、masterPortfolio、gitprofile、vivek9patel）；有详情页的基本是学术模板的"标题 + 摘要 + 图"条目。而招聘方的实际行为是：点进链接后 **90 秒内只做几个检查**——README 开头说什么、目录有没有入口、最大文件是不是 1200 行、commit 历史是不是 200 个 "fix"、demo 是不是活的（[kubaik 复盘](https://kubaik.github.io/portfolio-projects-hiring-managers-skip)）。详情页若只是"截图 + 一段话"，等于把最有价值的展示面浪费掉。

**5.3 缺可量化成果，叙事停在"我做了"而不是"变好了"。**
招聘侧复盘口径高度一致：合格的项目叙述是 **Context → Constraint → Decision → Trade-off → Outcome**，缺 Outcome 就被判"低杠杆"；"Boosted engagement significantly"等于没说，**要么给数字并说明怎么测的，要么说清观察到的行为变化**。正面样本：JSON Resume 作者在自己简历里写 "P@5 from 0.2 to 0.8"，一句话给出基线、方法和结果。

**5.4 首屏过重，性能与真实体验脱节。**
有一个很有价值的实测复盘：作者把作品集做成 Three.js 夜间列车场景，RUM 上 INP 与 LCP 都亮红；**真凶不是 WebGL 场景，而是加载器**——预热着色器阻塞首次点击（INP），一块 `opacity: 0.004`（而非 0）的大段文字被判定为 LCP 候选，LCP 被记到启动后 9–20 秒（[原文](https://dev.to/sheikh_abdullahbinalam_/i-built-my-portfolio-as-a-night-train-ride-in-vanilla-threejs-heres-what-actually-broke-3ol4)）。通用结论：**canvas 永远不是 LCP 元素**，3D 首屏的 LCP 实际落在海报图或标题上，性能预算必须按"静态海报"配（LCP ≤ 2.5s、INP ≤ 200ms、CLS ≤ 0.1）。此外"8MB 首屏 PNG、自托管 4K 演示视频"仍是被反复点名的常见错误。

**5.5 移动端排版崩塌。**
招聘方大量在通勤路上用手机扫作品集；而桌面模拟（vivek9patel）、hover-only 的卡片交互、双栏侧栏（v4、al-folio 部分页面）在 375px 宽度下普遍退化。**正样本**：mldangelo 明确把"320px 屏 / 200% 字号 / 高对比模式"列为验收项。

**5.6 SEO 与分享卡缺失。**
一次对 30 个开源模板的横评结论是"90% 连 Google 都读不懂"——不少模板只有 `<title>`，缺 `description`、`canonical`、`og:image`、结构化数据、sitemap。后果很具体：**把项目链接发到微信/飞书/Slack 时是一张空白卡片**。开箱做对的只有 timlrx（metadata + JSON-LD + 自动 sitemap/RSS）与 mldangelo（自动生成分享卡）。

**5.7 内容维护成本高，两个极端都不好。**
- 全配置化（devportfolio 单文件、developerFolio `portfolio.js`）：改一句话要动 TS/JS 再部署，字段僵硬，写不了长文。
- 全 Markdown 化（al-folio、academicpages）：灵活，但要懂 front matter、collection、Liquid，非技术维护者会卡住。
- 全自动（gitprofile）：几乎零维护，但**站点里没有一句你自己写的话**。
正解是**分层**：结构化字段（公司/职位/时间/技术栈）用 data，叙事（决策、取舍、复盘）用 Markdown。

**5.8 无障碍普遍缺失。**
绝大多数模板 README 里**没有任何 a11y 说明**（devportfolio 明确未提）；动效基本不判断 `prefers-reduced-motion`；技能条、hover 卡片、模拟桌面都是键盘与读屏用户的地雷。合规成本很低但没人做，**是很容易形成差异化的地方**。

**5.9 AI 模块：要么没有，要么就是一个套壳聊天框。**
典型失败模式有两种：**"检索没做好 + prompt 鼓励自信"→ 幻觉**（kelwu v1 把 95,000 字符全库塞进 prompt 又禁止说"不知道"，直接把项目说串）；**"为聊天框引入整套后端"**（sbtl.dev 的 K8s + pgvector + Redis）。做得最好的 JSON Resume 反而不是聊天框，而是带评测集的特定任务工具。详见 2.2 与 6.4。

---

## 6. 对本站的启示

前置判断：我们的需求（结构化简历 + 项目列表 + 项目详情 + GitHub 跳转 + 预留 AI）**不是"做一个 portfolio 模板"，而是"做一个内容型个人站"**。形态取 al-folio/mldangelo 的路由结构，数据层取 devportfolio/mldangelo 的单一数据源，视觉与性能预算取 simplefolio 的克制；**不要取 v4 的模仿度，也不要取 vivek9patel 的表演性**。

### 6.1 必须做（P0）

- **M1｜路由三分：`/`（首页摘要）+ `/resume`（结构化简历）+ `/projects`（列表）+ `/projects/[slug]`（详情）。**
  依据：详情页是本需求的核心差异化，而单页形态在 11 个候选里有 7 个根本承载不了（见 5.2）。首页保留单页流畅感（hero → 简介 → 精选 3 个项目 → 经历摘要 → 联系），深内容走子路由。
- **M2｜项目详情用 Markdown/MDX 作为唯一内容源，front matter 固定 schema。**
  建议字段：`title / slug / summary（一句话）/ role / period / team / stack[] / repoUrl / demoUrl / status / metrics[] / cover / featured`。
  依据：al-folio 用 Jekyll collection、timlrx 用 MDX，都是"内容与代码解耦"；否则 10+ 个详情页迟早变成手写 JSX 的维护地狱。**这条同时决定 AI 模块能不能做**（6.4 需要一个干净、结构化的知识源）。
- **M3｜项目卡片必须显式给「源码」按钮指向 GitHub 仓库，并用 GitHub API 补充 star / 主语言 / 最后更新时间。**
  约束：**构建时（或每 24h 再生成）拉取并落盘缓存，浏览器端不直连 GitHub API**；取不到时降级为 front matter 里的静态快照字段，**绝不因 API 失败让页面报错**。依据：gitprofile、al-folio `/repositories`、developerFolio 都证明这条路可行，但三者都需要缓存与降级。
- **M4｜简历页必须"可扫读 + 可带走"：时间线（经历/教育）+ 分组技能 + 荣誉，并提供预生成 PDF。**
  依据：v4 直接把 `resume.pdf` 放 static；mldangelo 做到"可打印 + 同时发布为 JSON Resume"。建议数据层按 JSON Resume 的 `basics/work/education/skills/projects` 命名对齐（即使不引入其 CLI），未来导出/换主题零迁移成本。
- **M5｜首屏性能预算写进验收标准。**
  首屏 LCP 元素 = 一张 ≤150KB 的 WebP/AVIF 海报图或纯文字标题（`fetchpriority="high"`，禁止 lazy）；动效运行时延迟到 `idle` 或进入视口后加载；尊重 `prefers-reduced-motion`；目标 LCP ≤ 2.5s、INP ≤ 200ms、CLS ≤ 0.1（移动端 Lighthouse ≥ 90）。
  依据：5.4 的 Three.js 实测与 canvas 不作 LCP 的通用结论。
- **M6｜SEO / 分享卡基础设施从第一天就建。**
  每页 metadata + `og:image`（项目详情页自动生成带项目名的分享卡）+ JSON-LD（`Person` + `CreativeWork`）+ `sitemap.xml` + `canonical`。
  依据：timlrx 已证明这套是"开箱即用"级别的工作量；缺失的代价是分享出去就是空白卡片。

### 6.2 值得做（P1）

- **S1｜项目标签筛选**（按技术栈/年份，纯前端）——数据里已有 `stack[]`，近乎零成本。依据：Varunyadavgithub 的 category filter、多个 Next.js 模板的筛选卖点。
- **S2｜项目详情的固定叙事结构**：背景与约束 → 我的角色 → 关键决策与取舍 → 结果（数字或可观察变化）→ 复盘（哪里做错了/会怎么改）。这是 5.3 的直接解药，**建议做成模板骨架 + 构建时 lint（缺 metrics 就警告）**。
- **S3｜暗色模式跟随系统 + 记忆**（al-folio、mldangelo、devportfolio 均有，成本极低）。
- **S4｜访问统计**：无 cookie 方案 + 一条环境变量开关，不自建（参考 al-folio 的 GDPR 同意门）。
- **S5｜Ctrl+K 全文搜索**：项目数 ≥10 个再上，否则过度设计。
- **S6｜"最近在做什么"**：对抗作品集腐烂，可由 GitHub 提交自动生成。

### 6.3 不要做（P2 及以下 / 明确排除）

- **N1｜不要做 3D / Canvas 大场景首屏。** 依据 5.4：性能与可访问性双重风险，且没有任何高 star 模板靠它取胜，投入产出比最差。
- **N2｜不要做"表演型"入口**（Ubuntu 桌面模拟、终端模拟、必须先点"开机"才进站）。vivek9patel 有 4.3k star 是**传播学上的成功、招聘意义上的失败**——信息被藏在图标后面。
- **N3｜不要为博客/评论/联系表单引入后端服务。** soumyajit4419 的 Express 后端是反例；联系表单用第三方服务或直接 mailto。
- **N4｜不做多语言**（除非确定投海外岗）。Ryan Balieiro 模板以 i18n 为唯一卖点，恰恰说明它稀有且成本高。
- **N5｜不要把"AI 聊天框"放在首屏或作为主入口。** 见 6.4。

### 6.4 AI 模块：现状证据与定位建议（给架构师的事实依据）

**A. 事实证据（回答了"别人做成什么样、失败在哪"）**

1. **AI 不是个人站的标配。** star 最高的五个模板（al-folio 16.4k / academicpages 17.8k / simplefolio 14.2k / timlrx 10.6k / v4 8.2k）功能列表里都没有 AI。
2. **做了 AI 的站点，形态高度雷同**：4/5 是"简历 RAG 问答"，1 个（JSON Resume）是"简历 × 招聘帖匹配"。前者已经商品化（有人在 Lemon Squeezy 卖"Chat with my resume"模板）。
3. **失败点非常集中，且都不是"模型不够好"**：
   - 内容不同步 → 改过的页面机器人不知道（kelwu v1 跳过已见页面）；
   - 检索退化 → 全库塞 prompt（95,000 字符/问），既贵又容易串项目；
   - 幻觉被 prompt 放大 → 禁止它说"不知道"，于是"自信地答错"；
   - 冷启动 → 访客第一次提问要等后端唤醒（Mrigank 专门加了健康探针）；
   - 架构失控 → 一个聊天框换来 pgvector + Redis + FastAPI + K8s + CI/CD（sbtl.dev）。
4. **唯一做得好的样本不是聊天框**：JSON Resume 的 AI 是"把简历匹配到 HN 招聘帖"这一具体任务，且**带 gold-set 评测集**（P@5 0.2 → 0.8）。有评测，才敢说它准。

**B. 定位建议（按性价比排序，三选一或组合）**

1. **首选：站内「检索型」助手 —— 只回答"这个站里有什么"。**
   典型问句："有没有做过 X 相关的项目""哪个项目用过 Y 技术""在 Z 公司负责什么"。
   硬约束：输入 **只能是本站 MDX/简历数据**；输出 **必须带站内链接作为出处**；检索不到就明说"站里没有"（对应 kelwu v2 的做法）。
   工程建议：**第一阶段用关键词/BM25 就够**（内容量 < 100 段时向量检索是过度设计），等问答日志积累出 15–30 条真实问题构成评测集，再决定要不要上 embedding。**没有评测集就不要上 RAG。**
2. **次选：面向作者的「内容生成」AI —— 对访客零运行时成本。**
   把 Git log / README / PR 描述 / 原型截图喂进去，草拟项目详情的"背景-约束-决策-结果"初稿，人工改。它直接打中 5.2 与 5.3 两个最大痛点，却**不需要后端、不会暴露密钥、不影响 LCP、不会把幻觉展现给访客**；顺带还能自动生成首页"最近在做什么"的时间线条目，反向解决 5.7 的维护成本。
3. **明确不做**：面向访客的通用聊天机器人做成门面；首屏聊天框；"问我任何问题"这类无边界入口（无边界的 AI 是幻觉的最佳温床）。

**C. 工程约束（无论选哪个，都写进架构约束）**

- **渐进增强**：没有 key / 没有后端时站点**必须完全正常**，AI 入口整体不渲染（而不是渲染一个坏掉的框）。
- **密钥只在服务端**；请求有超时、速率限制与每日额度上限。
- **可关闭 + 可降级**：AI 内容要有标识；模型报错时给静态兜底文案（"AI 助手暂时不可用，可以看项目列表"），不要白屏。
- **可度量**：从第一天记录提问与命中/未命中率——这是判断"值不值得留"的唯一依据。

### 6.5 建议架构师重点参考的章节

| 优先级 | 章节 | 用途 |
|---|---|---|
| ★★★ | 6.4（AI 定位）+ 6.1 M2（Markdown schema） | 这两条互相绑定：**AI 想做好，前提是内容结构干净** |
| ★★★ | 5.2 / 5.3 / S2（详情页叙事结构） | 本站最大的差异化点，也最容易做砸 |
| ★★☆ | 2.1 对比表 | 选型对照：谁做过什么、谁踩过什么坑 |
| ★★☆ | 6.1 M3 / M5 / M6 | GitHub API 缓存降级、性能预算、SEO 分享卡——三项都属于"事后补很贵" |
| ★☆☆ | 4（可借鉴功能表） | 排期时按成本/收益挑选 |

---

## 7. 参考链接清单

**模板 / 个人站**
1. al-folio — https://github.com/alshedivat/al-folio （≈16.4k；Jekyll collection 项目页、CV from cv.yml/JSON Resume、Ctrl+K 搜索、OG+schema.org）
2. academicpages — https://github.com/academicpages/academicpages.github.io （≈17.8k；纯 Markdown 内容维护上限样本）
3. simplefolio — https://github.com/cobiwave/simplefolio （≈14.2k；单页极简，无详情页）
4. tailwind-nextjs-starter-blog — https://github.com/timlrx/tailwind-nextjs-starter-blog （≈10.6k；SEO/JSON-LD/sitemap/RSS 最完整）
5. bchiang7/v4 — https://github.com/bchiang7/v4 （≈8.2k；被模仿最多的设计、static/resume.pdf、明确"请勿抄袭"）
6. developerFolio — https://github.com/saadpasta/developerFolio （≈6.7k；portfolio.js + GitHub API；官方声明停止维护）
7. soumyajit4419/Portfolio — https://github.com/soumyajit4419/Portfolio （≈6.5k；自带 Express 后端，反面样本）
8. portfolio-ideas — https://github.com/Evavic44/portfolio-ideas （≈6.4k；上百个同质化站点的合集，同质化证据）
9. devportfolio — https://github.com/RyanFitzgerald/devportfolio （≈5.0k；单 config.ts、时间线连线、无详情页无 PDF）
10. vivek9patel.github.io — https://github.com/vivek9patel/vivek9patel.github.io （≈4.3k；Ubuntu 桌面模拟，表演型入口反例）
11. masterPortfolio — https://github.com/ashutosh1919/masterPortfolio （≈4.2k；配置化单页）
12. gitprofile — https://github.com/arifszn/gitprofile （≈2.3k；GitHub API 驱动，零维护但无叙事）
13. mldangelo/personal-site — https://github.com/mldangelo/personal-site （≈1.7k；可打印简历 + JSON Resume + 分享卡 + a11y + CI 校验）
14. 第三方横评（Next.js 模板）— https://adminlte.io/blog/nextjs-portfolio-templates/
15. 第三方横评（React 模板）— https://adminlte.io/blog/react-portfolio-templates/
16. 横评（含 Simplefolio/devportfolio/GitProfile 定位）— https://uicookies.com/20-visually-brilliant-bootstrap-portfolio-templates-wordpress-themes-to-entice-targeted-users/

**AI 集成案例**
17. kelwu.com — 作品集 RAG 机器人的两版实现与失败复盘 — https://kelwu.com/ai-chatbot-rag-for-porfolio
18. sbtl.dev / portfolio-ai-assistant — https://forge.dotclear.watch/thesubtleties/portfolio-ai-assistant
19. Mrigank005/Portfolio（Gemini + Pinecone，冷启动健康探针）— https://git.codeproxy.net/Mrigank005/Portfolio
20. vetrinanda/MyPersonalPortfolio（FastAPI + SQLite RAG）— http://onlybits.org/vetrinanda/MyPersonalPortfolio
21. dev.to：Chat with my resume（模板商品化）— https://dev.to/okasputra/stop-sending-static-resumes-how-i-built-a-chat-with-my-resume-bot-nextjs-rag-4kdm

**数据标准 / 方法论**
22. JSON Resume 官网（227 themes、CLI、schema）— https://jsonresume.org/
23. JSON Resume 注册表样本 + AI 匹配与评测（作者自述）— https://registry.jsonresume.org/thomasdavis
24. Three.js 作品集的 LCP/INP 实测复盘 — https://dev.to/sheikh_abdullahbinalam_/i-built-my-portfolio-as-a-night-train-ride-in-vanilla-threejs-heres-what-actually-broke-3ol4
25. 首屏动效与 Core Web Vitals（canvas 不作 LCP 等）— https://charmotion.app/guides/hero-animation-core-web-vitals
26. 招聘方如何用 90 秒看一个项目（case study 四要素）— https://kubaik.github.io/portfolio-projects-hiring-managers-skip
27. UX 作品集 11 个红旗（首屏 5 秒定位、缺 impact delta）— https://uxplanet.org/good-ux-portfolios-never-get-interviews-6ea28fb2f9b3
28. 作品集常见错误（移动端、性能、流程文档）— https://fueler.io/blog/top-mistakes-to-avoid-when-building-proof-of-work
29. 30 个开源模板的 SEO 横评（90% 不可被正确索引）— https://cloud.tencent.cn/developer/article/2679789

> 说明：star 数为 2026-11-17 快照的近似值，仅用于量级参考；第 23、29 条含作者自述或第三方主观结论，引用时请按"观点"而非"数据"对待。
