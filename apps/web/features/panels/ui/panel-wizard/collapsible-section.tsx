import React from "react";
import { ChevronRight } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  isExpanded,
  onToggle,
  children,
}) => {
  return (
    <div className="overflow-hidden rounded-lg bg-gray-50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-gray-100"
      >
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <ChevronRight
          className={`size-4 text-gray-400 transition-transform duration-200 ${
            isExpanded ? "rotate-90" : ""
          }`}
        />
      </button>
      {isExpanded && <div className="space-y-4 border-t border-gray-200 px-4 pb-4">{children}</div>}
    </div>
  );
};
