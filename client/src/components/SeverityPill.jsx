import { ShieldAlert, AlertTriangle, AlertCircle, Check } from '../lib/icons.js';

const ICON_BY_LEVEL = {
  crisis: ShieldAlert,
  high: AlertTriangle,
  medium: AlertCircle,
  low: Check,
};

const LABEL_BY_LEVEL = {
  crisis: 'Crisis',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export default function SeverityPill({ level = 'low' }) {
  const Icon = ICON_BY_LEVEL[level] ?? Check;
  const label = LABEL_BY_LEVEL[level] ?? 'Low';
  return (
    <span className={`severity-pill-${level}`}>
      <Icon size={12} aria-hidden />
      {label}
    </span>
  );
}
