import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { BiSolidArrowFromRight } from "react-icons/bi";

interface TicketDetailHeaderProps {
  onClose: () => void;
  onCollapseToggle?: () => void;
}

export function TicketDetailHeader({ onClose, onCollapseToggle }: TicketDetailHeaderProps) {
  return (
    <div className="mt-1 bg-white px-6">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          className="p-1.5"
          onClick={() => {
            onCollapseToggle?.();
            console.log("Collapse toggle clicked");
          }}
        >
          <BiSolidArrowFromRight className="size-5" />
        </Button>
        <Button
          variant="outline"
          onClick={onClose}
          className="flex items-center space-x-2 px-2.5 py-1 text-base text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          <span>Close</span>
          <X className="size-5" />
        </Button>
      </div>
    </div>
  );
}