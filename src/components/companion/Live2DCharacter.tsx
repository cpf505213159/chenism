'use client';

import { useEffect, useRef, useState } from 'react';
import { CompanionAvatar } from './CompanionAvatar';
import type { CompanionLook } from './models';
// 只借类型，编译后会被擦除，不会把引擎打进 bundle
import type { L2D } from 'l2d';

/**
 * 站内助手的 Live2D 渲染层：官方示例 Momose Hiyori（Cubism 4 / .moc3）。
 * 引擎本身也吃 Cubism 2 的 .moc，将来换模型不用改这里。
 *
 * 选型：底层用 `l2d` 引擎，它只接一个 canvas、不自带菜单，可以塞进任意布局。
 * （`l2d-widget` 那种整包 widget 会自己 fixed 到页面角落，无法与我们的气泡/面板配合。）
 *
 * 三个必须处理好的坑：
 * 1. 引擎自身只带 Cubism 6 内核，但模块顶层引用了 Live2DCubismCore；
 *    缺了会在 import 阶段抛 ReferenceError（表现为"加载成功但一个像素都不画"）。
 * 2. React 开发模式下 effect 会执行两次，若复用同一个 canvas，
 *    第二次会撞上已销毁的 WebGL 上下文——渲染器照常"加载成功"，但一个像素都不画。
 *    所以每次挂载都新建 canvas，卸载时连同上下文一起丢弃。
 * 3. 引擎持有全局模型状态，两个实例同时 load 会互相踩（csmGetMocVersion 读到 undefined），
 *    所以加载/销毁都走 queueEngine 串行化。
 */

type Status = 'idle' | 'loading' | 'ready' | 'error';

let runtimesPromise: Promise<void> | null = null;

/**
 * 引擎内部持有全局模型状态，两个实例同时 load 会互相踩
 * （表现为 csmGetMocVersion 读到 undefined，一个像素都画不出来）。
 * 所以加载/销毁统一排队，一次只做一个。
 */
let engineChain: Promise<unknown> = Promise.resolve();

function queueEngine(task: () => Promise<void>): Promise<void> {
  const run = engineChain.then(task, task);
  engineChain = run.catch(() => undefined);
  return run;
}

/**
 * 运行时动态 import，绕开打包器。
 * 引擎压缩产物内部会自己注入一段引导脚本（读取全局的 Live2D 运行时），
 * 被 webpack/turbopack 打进 bundle 后这段引导会失效——症状是
 * csmGetMocVersion 读到 undefined，模型永远停在 loading。
 * 直接以原生 ESM 方式加载 public/_l2d/index.js 就与探针页一致，能正常渲染。
 */
const nativeImport = new Function('u', 'return import(u)') as (
  u: string,
) => Promise<{ init: (canvas: HTMLCanvasElement) => L2D }>;

function loadScript(src: string, marker: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-${marker}]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset[marker.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`${src} 加载失败`));
    document.head.appendChild(script);
  });
}

/**
 * Cubism 4 内核（Live2DCubismCore）：
 * `l2d` 模块顶层就引用了它，缺了会在 import 阶段直接抛 ReferenceError
 * （表现为"加载成功但一个像素都不画"，很难查）。
 * 注意：即使模型是 .moc3，引擎的部分工具函数仍依赖 live2d.min.js 暴露的全局符号，两个都要加载。
 */
async function ensureRuntimes(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (runtimesPromise) return runtimesPromise;

  runtimesPromise = (async () => {
    // 两个运行时互不依赖，必须并发：串行 await 会让 207KB 的下完才去下 129KB，
    // 在 3Mbps 的服务器上白白多花将近一倍时间（实测曾多等 1.2s）。
    // 注意仍要等两个都就绪再去 import 引擎包——它顶层就引用了 Live2DCubismCore。
    await Promise.all([
      loadScript('/live2d/live2dcubismcore.min.js', 'live2d-core4'),
      loadScript('/live2d/live2d.min.js', 'live2d-core2'),
    ]);
  })().catch((error) => {
    runtimesPromise = null;
    throw error;
  });

  return runtimesPromise;
}

export function Live2DCharacter({
  look,
  mood,
  className,
}: {
  look: CompanionLook;
  mood: 'idle' | 'thinking' | 'happy';
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const motionRef = useRef<((group: string) => void) | null>(null);
  // 模型的动作组名不统一，加载后记下可用的手势组，供情绪联动使用
  const gestureGroupRef = useRef<string | null>(null);
  const idleGroupRef = useRef<string | null>(null);
  const expressionRef = useRef<((id: string) => void) | null>(null);
  // started 只翻转一次，用来触发初始化；status 只影响渲染，
  // 若把它放进初始化 effect 的依赖里，'ready' 会触发清理并把 canvas 删掉。
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState<Status>('idle');

  // 挂载即开始预热最大件的资源（纹理 / moc3 / 引擎包），与下面的 idle 调度、
  // 运行时脚本并行下载。引擎自己的顺序是「运行时 JS → 引擎包 → 读 model3.json
  // → 才去下纹理和 moc3」，不预热的话这近 800KB 要等 JS 全部就绪才开始下，
  // 在 3Mbps 服务器上就是主要的一段白等。
  // 这里只下载不执行，失败也不处理——真正加载失败会走下面 effect 的 error 分支。
  //
  // 同时把 idle 的上限压到 250ms：原来的 900ms 意味着最坏情况下用户盯着空位
  // 将近一秒才开始下载。250ms 足够让首屏文字先 paint，又不至于肉眼可见地空着。
  useEffect(() => {
    for (const url of look.preload ?? []) {
      if (/\.(png|webp)$/i.test(url)) {
        // 引擎同样用 new Image() 取纹理，同 URL 会命中内存缓存，不会重复下载
        new Image().src = url;
      } else {
        void fetch(url, { cache: 'force-cache' }).catch(() => undefined);
      }
    }
    // 引擎包本身也提前下载（执行必须等运行时就绪，但下载可以并行）
    void fetch('/_l2d/index.js', { cache: 'force-cache' }).catch(() => undefined);

    const idle: (cb: () => void, opts?: { timeout?: number }) => number =
      window.requestIdleCallback ?? ((cb) => window.setTimeout(cb, 300));
    const handle = idle(
      () => {
        setStatus('loading');
        setStarted(true);
      },
      { timeout: 250 },
    );
    return () => {
      if (window.cancelIdleCallback && typeof handle === 'number') {
        window.cancelIdleCallback(handle);
      }
    };
    // look 在挂载时就固定了；换外观由父组件用 key 重挂载，故意不放进依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!started) return;
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let instance: L2D | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let observer: ResizeObserver | null = null;
    let cleanupExtras: (() => void) | null = null;

    queueEngine(async () => {
      try {
        await ensureRuntimes();
        if (disposed) return;

        const { init } = await nativeImport('/_l2d/index.js');
        if (disposed) return;

        canvas = document.createElement('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        // 宽高交给引擎：它内部按 clientWidth × devicePixelRatio 计算，
        // 这里手写会和它的 resize 逻辑互相覆盖（canvas-manager 里有注释警告）
        canvas.style.cssText = 'display:block;width:100%;height:100%;';
        host.appendChild(canvas);

        const l2d = init(canvas);
        if (!l2d) throw new Error('canvas 不可用');
        instance = l2d;
        motionRef.current = (group: string) => {
          try {
            l2d.playMotion(group);
          } catch {
            /* 动作组不存在时忽略 */
          }
        };

        expressionRef.current = (id: string) => {
          try {
            l2d.setExpression(id);
          } catch {
            /* 模型没有这套表情时忽略 */
          }
        };

        l2d.on('loaded', () => {
          if (!disposed) setStatus('ready');
        });

        await l2d.load({
          path: look.path,
          position: look.position,
          scale: look.scale,
          logLevel: 'error',
        });

        if (disposed) return;
        observer = new ResizeObserver(() => l2d.resize());
        observer.observe(host);

        // —— 让她"活"起来 ——
        // 不同模型的组名不统一（Hiyori 是 Idle/TapBody，别的模型可能是 idle/tap_body），
        // 这里按名字找，找不到 idle 就退回第一组。每隔 7~14 秒动一次。
        const motions = l2d.getMotions?.() ?? {};
        const groupNames = Object.keys(motions);
        const idleGroup = groupNames.find((g) => g.toLowerCase() === 'idle');
        const gestureGroups = groupNames.filter(
          (g) => g.toLowerCase() !== 'idle' && (motions[g]?.length ?? 0) > 0,
        );

        gestureGroupRef.current = gestureGroups[0] ?? idleGroup ?? null;
        idleGroupRef.current = idleGroup ?? null;

        // 实测过每个 idle 的摆幅（ParamAngleZ / Arm 变化量），只轮播幅度靠前的几个，
        // 否则九成动作都是微微呼吸，看上去像没动。（Hiyori：m02/m05/m03/m06）
        const EXPRESSIVE_IDLE = [1, 3, 2, 5];
        let idleCursor = 0;

        const playGesture = () => {
          if (disposed) return;
          try {
            // 一半播 TapBody（抬手/转身），一半轮播幅度大的 idle，避免同一个动作重复
            const tapList = gestureGroups.length > 0 ? motions[gestureGroups[0]] ?? [] : [];
            if (tapList.length > 0 && Math.random() < 0.5) {
              l2d.playMotion(gestureGroups[0], Math.floor(Math.random() * tapList.length), 3);
              return;
            }
            if (idleGroup && (motions[idleGroup]?.length ?? 0) > 0) {
              const pool = EXPRESSIVE_IDLE.filter((i) => i < motions[idleGroup].length);
              const index = pool.length > 0 ? pool[idleCursor % pool.length] : 0;
              idleCursor += 1;
              l2d.playMotion(idleGroup, index, 2);
            }
          } catch {
            /* 动作组不存在时忽略 */
          }
        };

        let gestureTimer = 0;
        let firstGesture = 0;
        // 系统开启"减少动态效果"时不再自动插播小动作（引擎自带的呼吸/idle 仍会跑，
        // 那属于角色的基础表现，不算额外动画干扰）
        const reduceMotion =
          window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        const scheduleGesture = () => {
          gestureTimer = window.setTimeout(
            () => {
              // 切到后台就别烧 CPU 了
              if (document.visibilityState === 'visible') playGesture();
              scheduleGesture();
            },
            7000 + Math.random() * 7000,
          );
        };
        // 系统开了"减少动态效果"就不自动播，避免持续动画干扰
        if (!reduceMotion) {
          scheduleGesture();
          // 刚上屏时先动一下，让人知道她"活"着
          firstGesture = window.setTimeout(playGesture, 1600);
        }

        // 鼠标扫过时轻轻动一下，冷却 4 秒，避免来回蹭触发个不停
        let lastHover = 0;
        const onEnter = () => {
          if (Date.now() - lastHover < 4000) return;
          lastHover = Date.now();
          playGesture();
        };
        host.addEventListener('pointerenter', onEnter);

        // 点哪儿都回应：引擎的 tap 事件要命中 HitArea 才触发，点空白处会没反应，
        // 所以自己监听 pointerdown，并加 300ms 冷却避免和引擎事件重复触发。
        let lastTap = 0;
        const onPointerDown = () => {
          if (Date.now() - lastTap < 300) return;
          lastTap = Date.now();
          playGesture();
        };
        host.addEventListener('pointerdown', onPointerDown);

        cleanupExtras = () => {
          window.clearTimeout(gestureTimer);
          window.clearTimeout(firstGesture);
          host.removeEventListener('pointerenter', onEnter);
          host.removeEventListener('pointerdown', onPointerDown);
        };
      } catch (error) {
        // 出错时给出可诊断的日志，而不是静默降级成占位图
        console.warn('[live2d] 初始化失败', error);
        if (!disposed) setStatus('error');
      }
    });

    return () => {
      disposed = true;
      motionRef.current = null;
      cleanupExtras?.();
      cleanupExtras = null;
      observer?.disconnect();
      // 销毁也排队：若此刻正在 load，等它结束后再释放，避免抢引擎全局状态
      const dying = instance;
      const dyingCanvas = canvas;
      instance = null;
      canvas = null;
      void queueEngine(async () => {
        try {
          dying?.destroy();
        } catch {
          /* 引擎内部已释放 */
        }
        dyingCanvas?.remove();
      });
    };
    // 外观参数（look.*）在挂载时就固定了；要换外观由父组件用 key 重挂载，
    // 所以这里只依赖 started，故意不带 look。
    // eslint-disable-next-line react-hooks/exhaustive-deps -- look 变化会走 key 重挂载
  }, [started]);

  // 情绪联动：表情用自建的 .exp3.json（官方模型只带参数不带表情），
  // 动作上思考走 idle、答完走手势，两者配合让状态切换看得出来。
  useEffect(() => {
    if (status !== 'ready') return;

    if (mood === 'thinking') {
      expressionRef.current?.('think');
      const group = idleGroupRef.current;
      if (group) motionRef.current?.(group);
      return;
    }

    if (mood === 'happy') {
      expressionRef.current?.('smile');
      const group = gestureGroupRef.current;
      if (group) motionRef.current?.(group);
      return;
    }

    expressionRef.current?.('calm');
  }, [mood, status]);

  if (status === 'error') {
    return <CompanionAvatar mood={mood} className={className} />;
  }

  return (
    <div
      ref={hostRef}
      className={className}
      style={{
        opacity: status === 'ready' ? 1 : 0,
        transition: 'opacity 420ms ease',
      }}
    />
  );
}
