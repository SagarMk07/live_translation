const STATUS_CONFIG = {
  idle: {
    icon: '💤',
    label: 'Ready',
    color: 'text-slate-500',
    bg: 'bg-slate-500/10 border-slate-500/20',
    dot: 'bg-slate-500',
  },
  listening: {
    icon: '🎤',
    label: 'Listening…',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/25',
    dot: 'bg-red-400 animate-pulse',
  },
  translating: {
    icon: '⚡',
    label: 'Translating…',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/25',
    dot: 'bg-amber-400 animate-ping',
  },
  speaking: {
    icon: '🔊',
    label: 'Generating Speech…',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/25',
    dot: 'bg-cyan-400 animate-pulse',
  },
};

export default function AIStatusBadge({ status = 'idle' }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-500 ${cfg.bg} ${cfg.color}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </div>
  );
}
