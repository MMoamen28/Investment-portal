const RISK_CONFIG = {
  LOW:    { label: 'منخفض',  bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500'  },
  MEDIUM: { label: 'متوسط',  bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  HIGH:   { label: 'مرتفع',  bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500'    },
};

const RiskBadge = ({ level, size = 'md' }) => {
  if (!level) return null;
  const cfg = RISK_CONFIG[level] || RISK_CONFIG.LOW;
  const px  = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${cfg.bg} ${cfg.text} ${px}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

export default RiskBadge;
