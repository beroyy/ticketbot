import { useEffect } from "react";
import Image from "next/image";
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
import { AlertTriangle, Loader, ChevronRight, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/loading-spinner";
import { FaDiscord } from "react-icons/fa6";
import { InlineCode } from "@/components/ui/typography";
import { useInitialSetupComplete } from "@/shared/stores/helpers";

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
  onInviteBot,
}: SelectServerModalProps) => {
  const initialSetupComplete = useInitialSetupComplete();

  const ownedGuilds = guilds.filter((g) => g.owner);
  const hasAnyBotInstalled = guilds.some((g) => g.connected);
  const setupRequired = hasAnyBotInstalled && guilds.some(({ setupRequired }) => setupRequired);
  const hasConfiguredGuild = guilds.some((g) => g.connected && !g.setupRequired);

  // Set initial setup complete when we have a configured guild
  useEffect(() => {
    if (hasConfiguredGuild && !initialSetupComplete) {
      useInitialSetupComplete.setState(true, true);
    }
  }, [hasConfiguredGuild, initialSetupComplete]);

  // Show setup complete UI when we have a configured guild but were in setup flow
  const showSetupComplete = initialSetupComplete && hasConfiguredGuild && !setupRequired;

  const handleGoToDashboard = () => {
    // Find the configured guild
    const configuredGuild = guilds.find((g) => !g.setupRequired && g.connected);
    if (configuredGuild) {
      // Select the guild (this will trigger navigation via AuthProvider)
      onGuildSelect(configuredGuild.id);
    }

    // Clear the initial setup complete state
    useInitialSetupComplete.setState(false, true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          showOverlay={false}
          className="fixed mx-auto w-full max-w-md rounded-3xl border border-none bg-white p-0 shadow-lg md:min-w-fit"
        >
          {!showSetupComplete && (
            <DialogHeader className="flex flex-row items-start justify-between space-y-0 border-b border-gray-200 p-6 pt-[30px] text-left">
              <div className="flex items-center gap-4">
                <div className="flex shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white p-2">
                  <FaDiscord className="size-6 text-[#5865f2]" />
                </div>
                <div>
                  <DialogTitle className="text-strong-black text-lg font-semibold">
                    {showSetupComplete
                      ? "You're all set!"
                      : hasAnyBotInstalled
                        ? "Finish Setup"
                        : "Let's Get Started"}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-[#525866]">
                    {showSetupComplete
                      ? "Head to the dashboard to customize even more"
                      : hasAnyBotInstalled
                        ? "You're just about ready to go"
                        : "It takes just 10 seconds to get setup"}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          )}

          <main className="max-h-[400px] space-y-6 overflow-y-auto px-8 py-8">
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
                {!hasAnyBotInstalled && (
                  <div className="flex flex-col items-center space-y-4 text-center">
                    <Image
                      src="/shiny-icon.png"
                      alt="shiny-icon"
                      width={64}
                      height={64}
                      className="mr-2"
                    />

                    <div className="space-y-2">
                      <h2 className="text-strong-black text-3xl font-medium tracking-tight">
                        Invite TicketsBot
                      </h2>
                      <p className="text-sub-gray">
                        You'll need admin access to complete this step
                      </p>
                    </div>
                  </div>
                )}
                {hasAnyBotInstalled &&
                  ownedGuilds.length > 0 &&
                  !setupRequired &&
                  !showSetupComplete && (
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
                {setupRequired && (
                  <div className="flex flex-col items-center space-y-4 rounded-lg p-3">
                    <h2 className="text-strong-black text-3xl font-medium tracking-tight">
                      Almost done!
                    </h2>
                    <p className="text-sub-gray mx-auto text-pretty text-center leading-loose">
                      TicketsBot was successfully installed. <br />
                      Run{"  "}
                      <InlineCode className="text-strong-black bg-[#f3f3f3] text-center font-mono text-sm font-light">
                        /setup auto
                      </InlineCode>{" "}
                      to finish setup{"  "}
                      <span className="inline-block">
                        <PartyPopper className="text-sub-gray/80 size-5 translate-y-0.5" />
                      </span>
                    </p>
                  </div>
                )}
                {showSetupComplete && (
                  <div className="flex flex-col items-center space-y-7 pt-2">
                    <Image
                      src="/logo-blue.svg"
                      alt="Logo"
                      width={245}
                      height={50}
                      className="aspect-auto"
                    />
                    <div className="space-y-3 pt-2 text-center">
                      <h2 className="text-strong-black text-3xl font-semibold tracking-tight">
                        You're all set!
                      </h2>
                      <p className="text-sub-gray max-w-10/12 mx-auto text-pretty">
                        Head into the dashboard to manage tickets, add staff and customize your
                        setup.
                      </p>
                    </div>
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

          <DialogFooter className="flex flex-col gap-3 rounded-2xl px-7 pb-[30px] sm:flex-row">
            {showSetupComplete ? (
              <Button
                className="bg-dark-faded-blue hover:bg-dark-faded-blue/90 flex flex-1 items-center justify-center gap-2 rounded-xl py-5 text-sm font-medium text-white"
                onClick={handleGoToDashboard}
              >
                <p>Go to Dashboard</p>
                <ChevronRight className="size-3.5" strokeWidth={2.5} />
              </Button>
            ) : setupRequired ? (
              <div className="mx-auto flex animate-pulse items-center justify-center rounded-lg">
                <p className="text-sub-gray text-center text-sm">Checking server setup</p>
                <Loader className="ml-2 size-4" />
              </div>
            ) : !hasAnyBotInstalled ? (
              <Button
                className="bg-dark-faded-blue hover:bg-dark-faded-blue/90 flex flex-1 items-center justify-center gap-2 rounded-xl py-5 text-sm font-medium text-white"
                onClick={onInviteBot}
              >
                <FaDiscord className="size-5" />
                <p className="leading-0 -translate-y-[1px]">Invite TicketsBot</p>
                <ChevronRight className="size-3.5" strokeWidth={2.5} />
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
