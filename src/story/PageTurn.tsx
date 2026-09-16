import type { ReactNode } from "react";
export function PageTurn({
  children,
  direction,
  turn,
}: {
  children: ReactNode;
  direction: 1 | -1;
  turn: number;
}) {
  return (
    <div className="page-perspective">
      <div
        key={turn}
        className={`paper-page turn-${direction === 1 ? "next" : "previous"}`}
      >
        <span className="paper-fold" aria-hidden="true" />
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}
