import type { MockApi } from "../../features/mock-apis/types";

type MethodPillProps = {
  method: string;
};

export function MethodPill({ method }: MethodPillProps) {
  return (
    <span className={`pill method-pill method-${method.toLowerCase()}`}>
      {method}
    </span>
  );
}
