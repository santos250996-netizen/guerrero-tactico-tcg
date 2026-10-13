"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function LegendaryBurst({ trigger, onDone }: { trigger: boolean; onDone?: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (trigger) { setShow(true); const t = setTimeout(() => { setShow(false); onDone?.(); }, 1800); return () => clearTimeout(t); }
  }, [trigger, onDone]);
  const sparks = Array.from({ length: 30 });
  return <AnimatePresence>{show && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center">
    <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: 3, opacity: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="h-40 w-40 rounded-full" style={{ background: "radial-gradient(circle, rgba(251,191,36,0.8) 0%, rgba(245,158,11,0.4) 40%, transparent 70%)" }} />
    {sparks.map((_, i) => { const angle = (i / sparks.length) * Math.PI * 2; const dist = 150 + Math.random() * 200; const dx = Math.cos(angle) * dist; const dy = Math.sin(angle) * dist; const size = 4 + Math.random() * 6; return <motion.div key={i} initial={{ x: 0, y: 0, opacity: 1, scale: 1 }} animate={{ x: dx, y: dy, opacity: 0, scale: 0.3 }} transition={{ duration: 1.2, delay: Math.random() * 0.1, ease: "easeOut" }} className="absolute rounded-full" style={{ width: size, height: size, backgroundColor: i % 3 === 0 ? "#fde68a" : i % 3 === 1 ? "#f59e0b" : "#fbbf24", boxShadow: "0 0 8px rgba(251,191,36,0.8)" }} />; })}
    <motion.div initial={{ scale: 0.3, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.15 }} className="absolute text-2xl font-black uppercase tracking-widest text-amber-400 [text-shadow:2px_2px_0_#000,0_0_20px_rgba(251,191,36,0.8)]">¡Legendaria!</motion.div>
  </motion.div>}</AnimatePresence>;
}
