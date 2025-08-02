import type { ReactNode } from "react";

type TicketsLayoutProps = {
  leftPanel: ReactNode;
  rightPanel?: ReactNode;
  isRightPanelOpen: boolean;
  isLeftPanelCollapsed?: boolean;
};

export function TicketsLayout({
  leftPanel,
  rightPanel,
  isRightPanelOpen,
  isLeftPanelCollapsed = false,
}: TicketsLayoutProps) {
  return (
    <main className="bg-background relative z-0 size-full">
      <div className={isRightPanelOpen ? "flex h-full overflow-scroll px-10" : "p-10"}>
        <div
          className={`transition-all duration-300 ease-in-out ${
            isRightPanelOpen
              ? isLeftPanelCollapsed
                ? "w-0 overflow-hidden"
                : "flex w-1/2 flex-col bg-white py-6"
              : "w-full"
          }`}
        >
          {leftPanel}
        </div>

        {isRightPanelOpen && rightPanel}
      </div>
    </main>
  );
}
