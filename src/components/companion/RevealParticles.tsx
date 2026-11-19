'use client';

import { useEffect, useRef } from 'react';

/**
 * 看板娘出场时的粒子层（纯装饰，不动 Live2D 本体）。
 *
 * 出现在角色下方，向上飘并轻微向躯干汇聚，等 Live2D 就绪（active 变 false）
 * 后 600ms 内淡出并彻底停掉。
 *
 * 开销控制（这是重点，避免再次卡顿）：
 * - 固定 24 个粒子，对象复用，每帧不分配新对象
 * - 帧率上限 30fps，DPR 上限 2
 * - 只跑一次：淡出结束后 cancelAnimationFrame，不留后台循环
 * - prefers-reduced-motion 直接不启动
 */
export function RevealParticles({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const COUNT = 24;
    type P = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      a: number;
      delay: number;
    };
    const parts: P[] = Array.from({ length: COUNT }, (_, i) => ({
      x: w * (0.15 + Math.random() * 0.7),
      y: h * (0.6 + Math.random() * 0.42),
      vx: (Math.random() - 0.5) * 0.16,
      vy: -0.2 - Math.random() * 0.4,
      r: 0.7 + Math.random() * 1.4,
      a: 0.12 + Math.random() * 0.42,
      // 错峰出现，避免"啪"地一下全冒出来
      delay: (i / COUNT) * 900,
    }));

    let raf = 0;
    let last = 0;
    let stopped = false;
    let elapsed = 0;
    let fadeAt = -1;
    const FRAME = 1000 / 30;
    const FADE_MS = 600;

    const draw = (now: number) => {
      if (stopped) return;
      raf = requestAnimationFrame(draw);
      if (now - last < FRAME) return;
      const dt = last ? now - last : 16;
      last = now;
      elapsed += dt;

      // 角色就位后开始淡出；只触发一次
      if (!activeRef.current && fadeAt < 0) fadeAt = elapsed;

      // 兜底：万一模型既没 loaded 也没报错（网络卡在半路），15s 后也收掉，
      // 不让粒子永远转下去白烧 CPU
      if (elapsed > 15000) {
        stopped = true;
        cancelAnimationFrame(raf);
        ctx.clearRect(0, 0, w, h);
        return;
      }

      let global = 1;
      if (fadeAt >= 0) {
        global = Math.max(0, 1 - (elapsed - fadeAt) / FADE_MS);
        if (global <= 0) {
          stopped = true;
          cancelAnimationFrame(raf);
          ctx.clearRect(0, 0, w, h);
          return;
        }
      }

      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h * 0.46;

      for (const p of parts) {
        if (elapsed < p.delay) continue;

        // 向躯干方向轻微吸引，营造"汇聚成形"的感觉
        p.vx += (cx - p.x) * 0.00028;
        p.vy += (cy - p.y) * 0.00014;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.995;
        p.vy *= 0.995;

        // 飘出上边界就从下方重新进场
        if (p.y < -8) {
          p.y = h + 8;
          p.x = w * (0.15 + Math.random() * 0.7);
          p.vy = -0.2 - Math.random() * 0.4;
        }

        const alpha = p.a * global;
        if (alpha <= 0.01) continue;

        ctx.beginPath();
        ctx.fillStyle = `rgba(127, 151, 201, ${alpha})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    raf = requestAnimationFrame(draw);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
    />
  );
}
