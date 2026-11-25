import { useEffect, useRef } from "react";
import { atmosphereTheme } from "../lib/weatherCode";

type Props = {
  weatherCode: number;
  isDay: boolean;
};

export function Atmosphere({ weatherCode, isDay }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = atmosphereTheme(weatherCode, isDay);

  useEffect(() => {
    const root = document.querySelector(".skylore") as HTMLElement | null;
    if (root) {
      root.style.setProperty("--sky-0", theme.sky[0]);
      root.style.setProperty("--sky-1", theme.sky[1]);
      root.style.setProperty("--sky-2", theme.sky[2]);
      root.style.setProperty("--accent", theme.accent);
    }
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;
    const particles = Array.from({ length: 48 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.4 + Math.random() * 1.8,
      s: 0.15 + Math.random() * 0.55,
      a: 0.15 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      i,
    }));

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const time = t * 0.001;

      // Soft drifting haze bands
      for (let i = 0; i < 3; i++) {
        const y = h * (0.22 + i * 0.18) + Math.sin(time * 0.35 + i) * 12;
        const grad = ctx.createLinearGradient(0, y - 40, 0, y + 40);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(0.5, `rgba(255,255,255,${0.05 + i * 0.02})`);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, y - 40, w, 80);
      }

      // Sun / moon disc
      if (theme.particle === "sun" || theme.particle === "stars") {
        const cx = w * 0.72;
        const cy = h * (theme.particle === "stars" ? 0.22 : 0.18);
        const pulse = reduced ? 1 : 1 + Math.sin(time * 0.8) * 0.03;
        const radius = (theme.particle === "stars" ? 28 : 46) * pulse;
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 3.2);
        glow.addColorStop(0, theme.accent);
        glow.addColorStop(0.25, `${theme.accent}99`);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const p of particles) {
        let x = p.x * w;
        let y = p.y * h;
        if (!reduced) {
          if (theme.particle === "rain" || theme.particle === "storm") {
            y = ((p.y + time * p.s * 0.55) % 1) * h;
            x = ((p.x + time * 0.03) % 1) * w;
          } else if (theme.particle === "snow") {
            y = ((p.y + time * p.s * 0.12) % 1) * h;
            x = (p.x + Math.sin(time * 0.6 + p.phase) * 0.02) * w;
          } else if (theme.particle === "mist") {
            x = (p.x + Math.sin(time * 0.2 + p.phase) * 0.04) * w;
            y = (p.y + Math.cos(time * 0.15 + p.phase) * 0.02) * h;
          } else if (theme.particle === "stars") {
            p.a = 0.2 + Math.abs(Math.sin(time * 0.7 + p.phase)) * 0.6;
          } else {
            x = (p.x + Math.sin(time * 0.25 + p.phase) * 0.015) * w;
            y = (p.y + Math.cos(time * 0.2 + p.i) * 0.01) * h;
          }
        }

        if (theme.particle === "rain" || theme.particle === "storm") {
          ctx.strokeStyle = `rgba(220,235,245,${0.25 + p.a * 0.35})`;
          ctx.lineWidth = theme.particle === "storm" ? 1.4 : 1;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - 2, y + 14 + p.r * 6);
          ctx.stroke();
        } else if (theme.particle === "snow") {
          ctx.fillStyle = `rgba(245,250,255,${0.35 + p.a * 0.4})`;
          ctx.beginPath();
          ctx.arc(x, y, p.r + 0.6, 0, Math.PI * 2);
          ctx.fill();
        } else if (theme.particle === "stars") {
          if (p.i % 3 !== 0) continue;
          ctx.fillStyle = `rgba(255,245,220,${p.a})`;
          ctx.beginPath();
          ctx.arc(x, y * 0.55, p.r * 0.7, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(255,255,255,${0.08 + p.a * 0.18})`;
          ctx.beginPath();
          ctx.arc(x, y, 8 + p.r * 10, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (theme.particle === "storm" && !reduced) {
        const flash = Math.sin(time * 17) > 0.992;
        if (flash) {
          ctx.fillStyle = "rgba(230,240,255,0.18)";
          ctx.fillRect(0, 0, w, h);
        }
      }

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    resize();
    draw(0);
    if (!reduced) raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [theme]);

  return (
    <>
      <div className="hero__atmosphere" aria-hidden />
      <canvas ref={canvasRef} className="hero__canvas" aria-hidden />
    </>
  );
}
