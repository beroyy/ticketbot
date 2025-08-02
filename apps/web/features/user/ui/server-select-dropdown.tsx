import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RiExpandUpDownLine } from "react-icons/ri";
import { useAuth } from "@/features/auth/auth-provider";
import { useGuildData } from "../hooks/use-guild-data";
import { cn } from "@/lib/utils";

export function ServerSelectDropdown() {
  const { selectedGuildId, setSelectedGuildId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const { guilds } = useGuildData();

  const handleGuildSelect = (guildId: string) => {
    setSelectedGuildId(guildId);
    setIsOpen(false);
  };

  // Calculate current guild from the guilds list
  const currentGuild = guilds.find(g => g.id === selectedGuildId);

  if (!selectedGuildId || !currentGuild) return null;

  const ownedGuilds = guilds.filter((g) => g.owner);
  // const otherGuilds = guilds.filter((g) => !g.owner);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="bg-primary-focused ring-ring-primary flex items-center gap-2 rounded-full border-[#1A4B8E] p-1.5 pr-3 ring-1 transition-colors hover:bg-white/20">
          <Avatar className="size-7">
            <AvatarImage src={currentGuild.iconUrl || undefined} alt={currentGuild.name} />
            <AvatarFallback className="bg-gray-600 text-xs font-medium text-white">
              {currentGuild.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="max-w-[120px] truncate text-sm font-medium text-white">
            {currentGuild.name}
          </span>
          <RiExpandUpDownLine className="size-4 text-white/80" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
        sideOffset={8}
      >
        <div className="space-y-4">
          {ownedGuilds.length > 0 && (
            <div>
              <h3 className="mb-2 px-2 text-xs font-medium text-gray-500">Your Servers</h3>
              <div className="space-y-1">
                {ownedGuilds.map((guild) => (
                  <ServerItem
                    key={guild.id}
                    guild={guild}
                    isSelected={guild.id === selectedGuildId}
                    onSelect={handleGuildSelect}
                  />
                ))}
              </div>
            </div>
          )}

          {/* {otherGuilds.length > 0 && (
            <div>
              <h3 className="mb-2 px-2 text-xs font-medium text-gray-500">Other Servers</h3>
              <div className="space-y-1">
                {otherGuilds.map((guild) => (
                  <ServerItem
                    key={guild.id}
                    guild={guild}
                    isSelected={guild.id === selectedGuildId}
                    onSelect={handleGuildSelect}
                  />
                ))}
              </div>
            </div>
          )} */}

          {/* <div className="flex items-center gap-2 border-t pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start gap-2 text-xs"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <MdRefresh className={cn("size-4", isLoading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start gap-2 text-xs"
              onClick={handleAddServer}
            >
              <MdAdd className="size-4" />
              Add New Server
            </Button>
          </div> */}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ServerItemProps {
  guild: {
    id: string;
    name: string;
    iconUrl?: string | null;
    connected: boolean;
    setupRequired?: boolean;
  };
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function ServerItem({ guild, isSelected, onSelect }: ServerItemProps) {
  return (
    <button
      onClick={() => onSelect(guild.id)}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
        isSelected ? "bg-gray-100" : "hover:bg-gray-50"
      )}
    >
      <Avatar className="size-8">
        <AvatarImage src={guild.iconUrl || undefined} alt={guild.name} />
        <AvatarFallback className="bg-gray-400 text-xs font-medium text-white">
          {guild.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-sm font-medium text-gray-900">{guild.name}</p>
      </div>
      <div className="flex items-center gap-1">
        <StatusBadge connected={guild.connected} setupRequired={guild.setupRequired} />
      </div>
    </button>
  );
}

interface StatusBadgeProps {
  connected: boolean;
  setupRequired?: boolean;
}

function StatusBadge({ connected, setupRequired }: StatusBadgeProps) {
  if (setupRequired) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        <span className="size-1.5 rounded-full bg-amber-500" />
        Setup Required
      </span>
    );
  }

  if (connected) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <span className="size-1.5 rounded-full bg-green-500" />
        Connected
      </span>
    );
  }

  return null;
}
