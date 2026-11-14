import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  DOMAIN_WORLDS,
  GHOST_NODES,
  STATUS_COLOR,
  STATUS_LABEL,
  type DomainWorld,
} from "@/data/domains";

interface DomainConstellationProps {
  className?: string;
  paused?: boolean;
}

export const DomainConstellation = ({
  className = "",
  paused = false,
}: DomainConstellationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(0.85);

  useLayoutEffect(() => {
    const fit = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const minSide = Math.min(clientWidth || window.innerWidth, clientHeight || window.innerHeight);
      const target = Math.max(340, minSide * 0.85);
      setScale(Math.max(0.48, Math.min(1.0, target / (2 * 450))));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // Ambient twinkling starfield canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    type Star = {
      x: number;
      y: number;
      r: number;
      a: number;
      tw: number;
      ph: number;
      tint: string;
    };
    let stars: Star[] = [];
    let w = 0;
    let h = 0;

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.parentElement?.clientWidth || window.innerWidth;
      h = canvas.parentElement?.clientHeight || window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.round((w * h) / 4000);
      stars = Array.from({ length: count }, () => {
        const roll = Math.random();
        const tint =
          roll > 0.96
            ? "#FFE4C4"
            : roll > 0.92
              ? "#B8D4FF"
              : roll > 0.88
                ? "#FFF8E7"
                : "#FFFFFF";
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.2 + 0.2,
          a: Math.random() * 0.5 + 0.1,
          tw: Math.random() * 0.4 + 0.1,
          ph: Math.random() * Math.PI * 2,
          tint,
        };
      });
    };

    build();
    window.addEventListener("resize", build);

    const render = (time: number) => {
      ctx.clearRect(0, 0, w, h);

      const t = paused || reduced ? 0 : time * 0.001;
      for (const s of stars) {
        const twinkle = reduced ? s.a : s.a + Math.sin(t * s.tw * 2 + s.ph) * 0.25;
        ctx.fillStyle = s.tint;
        ctx.globalAlpha = Math.max(0.04, Math.min(1, twinkle));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", build);
    };
  }, [paused]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden pointer-events-none select-none ${
        paused ? "universe-frozen" : ""
      } ${className}`}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />

      <div
        className="absolute left-1/2 top-1/2 transition-transform duration-500 ease-out"
        style={{
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        {/* Orbital rings */}
        {DOMAIN_WORLDS.map((w) => (
          <div
            key={`ring-${w.id}`}
            className="universe-orbit-ring"
            style={{ width: 2 * w.orbit, height: 2 * w.orbit }}
          />
        ))}

        {/* Ghost nodes in outer perimeter */}
        {GHOST_NODES.map((g, i) => {
          const d = 2 * g.orbit;
          const delay = -(g.phase / 360) * g.period;
          return (
            <div
              key={`ghost-${i}`}
              className="orbit-holder absolute"
              style={{
                width: d,
                height: d,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <div
                className="universe-spin"
                style={{
                  animationDuration: `${g.period}s`,
                  animationDelay: `${delay}s`,
                }}
              >
                <div
                  className="absolute rounded-full"
                  style={{
                    top: 0,
                    left: "50%",
                    width: 10 * g.size + 4,
                    height: 10 * g.size + 4,
                    transform: "translate(-50%, -50%)",
                    background: "radial-gradient(circle at 35% 30%, #55555f, #2a2a30)",
                    opacity: 0.22,
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* Domain nodes */}
        {DOMAIN_WORLDS.map((w) => (
          <ConstellationNode key={w.id} world={w} />
        ))}

        {/* Central Core (REBON System Center) */}
        <div
          className="absolute left-1/2 top-1/2 flex items-center justify-center pointer-events-none"
          style={{ transform: "translate(-50%, -50%)" }}
        >
          <div
            className="absolute rounded-full"
            style={{
              width: 180,
              height: 180,
              background:
                "radial-gradient(circle, rgba(124,58,237,0.32) 0%, rgba(124,58,237,0.1) 42%, transparent 72%)",
              animation: "universe-sun-breathe 6s ease-in-out infinite",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: 60,
              height: 60,
              background:
                "radial-gradient(circle, rgba(245,158,11,0.2) 0%, rgba(124,58,237,0.15) 50%, transparent 80%)",
            }}
          />
          <span
            className="relative font-display font-extrabold text-white/90"
            style={{
              fontSize: 22,
              letterSpacing: "0.10em",
              textShadow: "0 0 24px rgba(167,139,250,0.6)",
            }}
          >
            LexiClash
          </span>
        </div>
      </div>
    </div>
  );
};

const ConstellationNode = ({ world }: { world: DomainWorld }) => {
  const color = STATUS_COLOR[world.status];
  const d = 2 * world.orbit;
  const delay = -(world.phase / 360) * world.period;
  const base = 34 * world.size;

  const nodeStyle: React.CSSProperties =
    world.status === "live"
      ? {
          background: `radial-gradient(circle at 32% 28%, #FCD98A, ${color} 55%, #7a4d05 100%)`,
          boxShadow: `0 0 20px 2px ${color}88`,
          animation: "live-pulse 2.2s ease-out infinite",
        }
      : world.status === "launching"
        ? {
            background: `radial-gradient(circle at 32% 28%, #C4A9FF, ${color} 58%, #3b1e7a 100%)`,
            border: `1.5px solid ${color}`,
            boxShadow: `0 0 16px -2px ${color}aa`,
          }
        : {
            background: `radial-gradient(circle at 32% 28%, #3a3a42, #26262c 60%, #17171b 100%)`,
            border: "1px solid #33333b",
            opacity: 0.72,
          };

  return (
    <div
      className="orbit-holder absolute"
      style={{
        width: d,
        height: d,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }}
    >
      <div
        className="universe-spin"
        style={{
          animationDuration: `${world.period}s`,
          animationDelay: `${delay}s`,
        }}
      >
        <div
          className="absolute"
          style={{ top: 0, left: "50%", transform: "translate(-50%, -50%)" }}
        >
          <div
            className="universe-counterspin inline-flex flex-col items-center"
            style={{
              animationDuration: `${world.period}s`,
              animationDelay: `${delay}s`,
            }}
          >
            <span
              className="mb-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.14em]"
              style={{
                color: world.status === "soon" ? "#9b9ba3" : color,
                background:
                  world.status === "soon" ? "rgba(0,0,0,0.5)" : `${color}1F`,
                border: `1px solid ${
                  world.status === "soon" ? "#3a3a42" : `${color}66`
                }`,
              }}
            >
              {STATUS_LABEL[world.status]}
            </span>

            <div
              className="relative rounded-full"
              style={{
                width: base,
                height: base,
                ...nodeStyle,
              }}
            >
              <span
                className="absolute rounded-full"
                style={{
                  inset: "14% 40% 55% 20%",
                  background: "rgba(255,255,255,0.35)",
                  filter: "blur(2px)",
                }}
              />
            </div>

            <span
              className="mt-1.5 whitespace-nowrap font-display text-[11px] tracking-wide"
              style={{ color: world.status === "soon" ? "#8b8b94" : "#FAFAFA" }}
            >
              {world.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DomainConstellation;
