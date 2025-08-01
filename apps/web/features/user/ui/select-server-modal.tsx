import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/loading-spinner";
import { FaDiscord } from "react-icons/fa6";

interface Guild {
  id: string;
  name: string;
  iconUrl?: string | null;
  owner: boolean;
  connected: boolean;
  setupRequired?: boolean;
}

interface SelectServerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  guilds: Guild[];
  isLoading: boolean;
  selectedGuildId: string | null;
  onGuildSelect: (guildId: string) => void;
  onInviteBot: () => void;
}

export const SelectServerModal = ({ 
  isOpen, 
  onOpenChange, 
  guilds, 
  isLoading, 
  selectedGuildId, 
  onGuildSelect, 
  onInviteBot 
}: SelectServerModalProps) => {

  const ownedGuilds = guilds.filter((g) => g.owner);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        showOverlay={false}
        className="fixed mx-auto w-full max-w-md rounded-2xl border border-none bg-white p-0 shadow-lg md:min-w-fit"
      >
        <DialogHeader className="flex flex-row items-start justify-between space-y-0 border-b border-gray-200 p-6 text-left">
          <div className="flex items-center gap-4">
            <div className="flex shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white p-2">
              <FaDiscord className="size-6 text-[#5865f2]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-[#103a71]">
                Setup TicketsBot
              </DialogTitle>
              <DialogDescription className="text-sm text-[#525866]">
                Which server do you want to manage tickets for?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <main className="max-h-[400px] space-y-6 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : guilds.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">
                No servers found. Invite TicketsBot to your server to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {ownedGuilds.length > 0 && (
                <div className="space-y-3 pb-0.5">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Your Servers
                  </h3>
                  {ownedGuilds.map((guild) => (
                    <GuildItem
                      key={guild.id}
                      guild={guild}
                      selectedGuildId={selectedGuildId}
                      onSelect={onGuildSelect}
                    />
                  ))}
                </div>
              )}
              {/* {otherGuilds.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                    Other Servers
                  </h3>
                  <div className="space-y-3">
                    {otherGuilds.map((guild) => (
                      <GuildItem
                        key={guild.id}
                        guild={guild}
                        onSelect={onGuildSelect}
                        onSettings={handleSettings}
                      />
                    ))}
                  </div>
                </div>
              )} */}
            </div>
          )}
        </main>

        <DialogFooter className="flex flex-col gap-3 border-t border-gray-200 p-6 sm:flex-row">
          {/* <Button
            variant="outline"
            className="flex-1 font-semibold"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button> */}
          <Button
            className="flex-1 bg-[#122368] font-semibold text-white hover:bg-[#122368]/90"
            onClick={onInviteBot}
          >
            <Plus className="mr-2 h-4 w-4" />
            Invite TicketsBot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

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

const GuildItem = ({ guild, selectedGuildId, onSelect }: GuildItemProps) => {
  return (
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
        {/* <Button
          variant="ghost"
          size="icon"
          className="bg-white text-gray-500 hover:bg-gray-100"
          onClick={() => onSettings(guild.id)}
        >
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings for {guild.name}</span>
        </Button> */}
      </div>
    </div>
  );
};
