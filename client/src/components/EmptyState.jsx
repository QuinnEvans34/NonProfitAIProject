export default function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={32} aria-hidden className="empty-state-icon" />}
      {title && <div className="empty-state-title">{title}</div>}
      {body && <div className="empty-state-body">{body}</div>}
      {action && <div>{action}</div>}
    </div>
  );
}
