import { ReactNode } from "react";

interface TicketsPageLayoutProps {
  children: ReactNode;
}

export function TicketsPageLayout({ children }: TicketsPageLayoutProps) {
  return <div className="bg-background relative z-0 size-full">{children}</div>;
}