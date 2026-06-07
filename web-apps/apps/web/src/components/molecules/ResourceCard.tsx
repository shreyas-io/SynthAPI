import { Link } from "react-router";
import { Trash2 } from "lucide-react";

type ResourceCardProps = {
  to?: string;
  title: string;
  pill?: string;
  onDelete?: (() => void) | undefined;
  deleteLabel?: string | undefined;
  deleteDisabled?: boolean | undefined;
  secondaryAction?: React.ReactNode | undefined;
  children: React.ReactNode;
  className?: string;
};

export function ResourceCard({
  to,
  title,
  pill,
  onDelete,
  deleteLabel,
  deleteDisabled,
  secondaryAction,
  children,
  className = "",
}: ResourceCardProps) {
  const content = (
    <>
      <h2>{title}</h2>
      {pill && (
        <p>
          <span className="pill">{pill}</span>
        </p>
      )}
      {children}
    </>
  );

  return (
    <div className={`card link-card project-card ${className}`}>
      {to ? (
        <Link className="project-card-link" to={to}>
          {content}
        </Link>
      ) : (
        <div className="project-card-link">{content}</div>
      )}
      {onDelete && (
        <button
          type="button"
          className="button danger-btn icon-only-action project-card-delete"
          onClick={onDelete}
          disabled={deleteDisabled}
          aria-label={deleteLabel}
          title={deleteLabel}
        >
          <Trash2 size={14} />
        </button>
      )}
      {secondaryAction}
    </div>
  );
}
