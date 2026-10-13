"use client";
import { useEffect, useState } from "react";
const COLORS = ["#fbbf24","#f59e0b","#ef4444","#10b981","#3b82f6","#a855f7","#fde68a"];
export function Confetti({ trigger }: { trigger: boolean }) {
  const [particles, setParticles] = useState<{ id: number; x: number; delay: number; duration: number; rotation: number; color: string; size: number; drift: number }[]>([]);
  useEffect(() => {
    if (!trigger) return;
    const arr = Array.from({ length: 80 }, (_, i) => ({ id: i, x: Math.random() * 100, delay: Math.random() * 0.5, duration: 1.8 + Math.random() * 1.5, rotation: Math.random() * 720 - 360, color: COLORS[Math.floor(Math.random() * COLORS.length)], size: 6 + Math.random() * 8, drift: (Math.random() - 0.5) * 60 }));
    let cancelled = false;
    Promise.resolve().then(() => { if (!cancelled) setParticles(arr); });
    const t = setTimeout(() => setParticles([]), 4000);
    return () => { cancelled = true; clearTimeout(t); };
  }, [trigger]);
  if (particles.length === 0) return null;
  return <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">{particles.map((p) => <span key={p.id} className="absolute top-0 block" style={{ left: `${p.x}vw`, width: `${p.size}px`, height: `${p.size * 1.6}px`, backgroundColor: p.color, borderRadius: "2px", animation: `confetti-fall ${p.duration}s linear ${p.delay}s forwards`, ["--drift" as never]: `${p.drift}vw`, ["--rotation" as never]: `${p.rotation}deg` }} />)}<style>{`@keyframes confetti-fall{0%{transform:translateY(-10vh) translateX(0) rotate(0deg);opacity:1}100%{transform:translateY(110vh) translateX(var(--drift)) rotate(var(--rotation));opacity:.6}}`}</style></div>;
}
