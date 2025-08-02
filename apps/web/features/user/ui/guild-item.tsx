import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type GuildItemProps = {
  guild: {
    id: string;
    name: string;
    iconUrl?: string | null;
    connected: boolean;
    setupRequired?: boolean;
  };
  selectedGuildId: string | null;
  onSelect: (guildId: string) => void;
};

export const GuildItem = ({ guild, selectedGuildId, onSelect }: GuildItemProps) => {
  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex items-center rounded-xl p-3 hover:bg-[#f6f7ff]",
          selectedGuildId === guild.id && "bg-[#f6f7ff] ring-1 ring-[#103a71]/70"
        )}
      >
        <button
          onClick={() => onSelect(guild.id)}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <Avatar className="size-10">
            <AvatarImage src={guild.iconUrl || undefined} alt={guild.name} />
            <AvatarFallback className="bg-gray-400 text-sm font-medium text-white">
              {guild.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold text-[#103a71]">{guild.name}</span>
        </button>
        <div className="flex items-center gap-3">
          {guild.connected ? (
            guild.setupRequired ? (
              <Badge
                variant="outline"
                className="border-[#fffaeb] bg-[#fffaeb] font-semibold text-[#f6b51e]"
              >
                <AlertTriangle className="mr-1 h-4 w-4" />
                Setup Required
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-[#efebff] bg-[#efebff] font-semibold text-[#7d52f4]"
              >
                <span className="mr-2 h-2 w-2 rounded-full bg-[#7d52f4]"></span>
                Connected
              </Badge>
            )
          ) : (
            <Badge
              variant="outline"
              className="border-gray-200 bg-gray-100 font-semibold text-gray-600"
            >
              Not Added
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};
