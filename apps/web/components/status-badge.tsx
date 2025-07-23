import { Badge } from "@/components/ui/badge";
import { FaClock as Clock } from "react-icons/fa6";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  console.log("StatusBadge render - status:", status);

  // Determine colors based on status
  const getStatusColors = (status: string) => {
    switch (status) {
      case "in_progress":
        return {
          background: "bg-[#FFFAEB] text-[#F6B51E]",
          icon: "text-[#F6B51E]",
          label: "In Progress",
        };
      case "on_hold":
        return {
          background: "bg-[#FFF1EB] text-[#FF8447]",
          icon: "text-[#FF8447]",
          label: "On Hold",
        };
      case "open":
        return {
          background: "bg-blue-50 text-blue-700",
          icon: "text-blue-600",
          label: "Open",
        };
      case "closed":
        return {
          background: "bg-gray-100 text-gray-700",
          icon: "text-gray-600",
          label: "Closed",
        };
      default:
        return {
          background: "bg-gray-100 text-gray-700",
          icon: "text-gray-600",
          label: status,
        };
    }
  };

  const colors = getStatusColors(status);

  return (
    <Badge
      className={`${colors.background} pointer-events-none flex items-center space-x-1 rounded-full border-0 px-2 text-sm font-medium`}
    >
      <Clock className={`size-3.5 ${colors.icon}`} />
      <span>{colors.label}</span>
    </Badge>
  );
};
