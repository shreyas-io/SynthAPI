import { ReactNode } from "react";

type BlockHeaderProps = {
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
};

export function BlockHeader({ title, meta, actions }: BlockHeaderProps) {
  return (
    <header className="dense-block-header">
      <div className="route-identity">
        {typeof title === "string" ? <h1>{title}</h1> : title}
        {meta}
      </div>
      {actions}
    </header>
  );
}
