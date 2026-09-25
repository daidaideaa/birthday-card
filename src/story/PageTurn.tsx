import type { ReactNode } from "react";
export function PageTurn({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="page-perspective">
      <div className="paper-page">
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}
