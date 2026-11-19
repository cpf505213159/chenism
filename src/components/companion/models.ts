/**
 * 站内助手的外观配置。
 *
 * 只有一套：Momose Hiyori（Live2D 官方免费示例模型，Cubism 4 / .moc3）。
 *
 * 关于"换装"：核对过官方 free/pro 两个修订版与官网预览图，是同一套衣服
 * （水手服配米色针织开衫）；模型 70 个参数里也没有任何服装开关，
 * 只有手臂、头发、裙摆、蝴蝶结。所以 Hiyori 做不了换装，本站也就不提供换装入口。
 *
 * 取景：引擎会把模型"站"在画布底边，0.95 时头顶与鞋底各留 6~8% 余量，皮鞋不会被切。
 *
 * 曾经用过 shizuku：那套模型靠 pose.json 切换手臂部件，叠加动作会出现"四条胳膊"，
 * 属于模型结构问题，已弃用。
 */

export type CompanionLook = {
  /** 稳定标识，用于日志 */
  id: string;
  /** 无障碍标签与调试用的名字 */
  name: string;
  path: string;
  scale: number;
  position: [number, number];
};

export const COMPANION_LOOK: CompanionLook = {
  id: 'hiyori',
  name: 'Hiyori',
  path: '/live2d/hiyori/Hiyori.model3.json',
  scale: 0.95,
  position: [0, 0.06],
};
