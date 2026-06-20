import { useState, useEffect, useRef } from 'react';
import { ClockCircleOutlined } from '@ant-design/icons';

const fmt = (s) => {
  if (s <= 0) return 'انتهى الوقت';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const SLATimer = ({ deadline, breached }) => {
  const [remaining, setRemaining] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!deadline) return;
    const calc = () => Math.max(0, Math.floor((new Date(deadline) - Date.now()) / 1000));
    setRemaining(calc());
    ref.current = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(ref.current);
  }, [deadline]);

  if (!deadline) return null;

  const urgent  = remaining < 3600 && remaining > 0;
  const expired = remaining === 0 || breached;

  return (
    <span className={`inline-flex items-center gap-1 font-mono text-sm font-semibold ${
      expired ? 'text-red-600 sla-urgent' : urgent ? 'text-orange-500' : 'text-primary-700'
    }`}>
      <ClockCircleOutlined />
      {expired ? 'تم تجاوز الميعاد' : fmt(remaining)}
    </span>
  );
};

export default SLATimer;
