import { useEffect, useRef } from 'react';

const BAR_COUNT = 32;
const BAR_MIN_HEIGHT = 3;
const COLORS = {
  active: (i, total) => {
    const t = i / total;
    const r = Math.round(99  + (6   - 99)  * t);
    const g = Math.round(102 + (182 - 102) * t);
    const b = Math.round(241 + (212 - 241) * t);
    return `rgb(${r},${g},${b})`;
  },
  idle: 'rgba(99,102,241,0.2)',
};

export default function WaveformVisualizer({ getAnalyserData, isActive, height = 72 }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const data = isActive ? getAnalyserData?.() : null;
      const barW = Math.floor((W - (BAR_COUNT - 1) * 2) / BAR_COUNT);

      for (let i = 0; i < BAR_COUNT; i++) {
        let value = BAR_MIN_HEIGHT;
        if (data && isActive) {
          // Sample from frequency data spread across bars
          const idx = Math.floor((i / BAR_COUNT) * data.length);
          value = Math.max(BAR_MIN_HEIGHT, (data[idx] / 255) * H);
        } else {
          // Idle: gentle breathing sine wave
          value = BAR_MIN_HEIGHT + Math.sin(Date.now() / 1000 + i * 0.4) * 4 + 4;
        }

        const x = i * (barW + 2);
        const y = (H - value) / 2;

        ctx.fillStyle = isActive ? COLORS.active(i, BAR_COUNT) : COLORS.idle;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, value, 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isActive, getAnalyserData]);

  // Resize canvas with device pixel ratio
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;
      canvas.getContext('2d').scale(dpr, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: `${height}px` }}
      className="rounded-lg"
    />
  );
}
