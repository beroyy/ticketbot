import { ReactNode } from "react";

interface PanelLayoutProps {
  children: ReactNode;
  header?: ReactNode;
  className?: string;
  withBorder?: boolean;
  rounded?: boolean;
}

export function PanelLayout({
  children,
  header,
  className = "",
  withBorder = true,
  rounded = true,
}: PanelLayoutProps) {
  const baseClasses = "flex flex-col bg-white";
  const borderClasses = withBorder ? "nice-gray-border border" : "";
  const roundedClasses = rounded ? "rounded-2xl" : "";

  return (
    <div className={`${baseClasses} ${borderClasses} ${roundedClasses} ${className}`}>
      {header && <div className="border-b p-6">{header}</div>}
      <div className="flex-1">{children}</div>
    </div>
  );
}