import { ReactNode } from "react";

interface SplitViewLayoutProps {
  leftPanel: ReactNode;
  rightPanel?: ReactNode;
  isRightPanelOpen: boolean;
  isLeftPanelCollapsed?: boolean;
}

export function SplitViewLayout({
  leftPanel,
  rightPanel,
  isRightPanelOpen,
  isLeftPanelCollapsed = false,
}: SplitViewLayoutProps) {
  return (
    <div className={isRightPanelOpen ? "flex h-full overflow-scroll px-10" : "p-10"}>
      {/* Left Panel */}
      <div
        className={
          isRightPanelOpen
            ? isLeftPanelCollapsed
              ? "w-0 overflow-hidden"
              : "flex w-1/2 flex-col bg-white py-6"
            : "w-full"
        }
      >
        {leftPanel}
      </div>

      {/* Right Panel */}
      {isRightPanelOpen && rightPanel}
    </div>
  );
}