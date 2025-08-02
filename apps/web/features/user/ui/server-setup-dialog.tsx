import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import { CheckCircle, ExternalLink } from "lucide-react";
import { VisuallyHidden } from "radix-ui";
import { cn } from "@/lib/utils";

type Guild = {
  id: string;
  name: string;
  iconUrl?: string | null;
  owner: boolean;
  connected: boolean;
  setupRequired?: boolean;
};

type ServerSetupDialogProps = {
  guilds: Guild[];
  isLoading: boolean;
  selectedGuildId: string | null;
  onGuildSelect: (guildId: string) => void;
  onInviteBot: () => void;
};

export function ServerSetupDialog({
  guilds,
  isLoading,
  selectedGuildId,
  onGuildSelect,
  onInviteBot,
}: ServerSetupDialogProps) {
  const connectedGuilds = guilds.filter((g) => g.connected);
  const hasConnectedGuilds = connectedGuilds.length > 0;

  const handleGuildClick = (guildId: string) => {
    onGuildSelect(guildId);
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <VisuallyHidden.Root>
        <DialogTitle>Setup Server</DialogTitle>
      </VisuallyHidden.Root>
      <DialogContent
        showCloseButton={false}
        showOverlay={false}
        aria-describedby={undefined}
        className="fixed mx-auto w-full max-w-md rounded-3xl border border-none bg-white p-0 shadow-lg md:min-w-fit"
      >
        <div className="px-8 py-6">
          <h2 className="mb-2 text-2xl font-bold">Select Your Server</h2>
          <p className="text-gray-600">Choose a server to manage with TicketsBot</p>
        </div>

        <main className="max-h-[400px] space-y-4 overflow-y-auto px-8 pb-8">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : !hasConnectedGuilds ? (
            <div className="py-8 text-center">
              <p className="mb-6 text-gray-600">TicketsBot isn't in any of your servers yet.</p>
              <Button onClick={onInviteBot} size="lg" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Invite TicketsBot
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {connectedGuilds.map((guild) => (
                  <button
                    key={guild.id}
                    onClick={() => handleGuildClick(guild.id)}
                    className={cn(
                      "w-full rounded-lg border p-4 text-left transition-all hover:shadow-md",
                      selectedGuildId === guild.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {guild.iconUrl ? (
                        <img
                          src={guild.iconUrl}
                          alt={guild.name}
                          className="size-12 rounded-full"
                        />
                      ) : (
                        <div className="flex size-12 items-center justify-center rounded-full bg-gray-200">
                          <span className="text-lg font-semibold text-gray-600">
                            {guild.name[0]}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold">{guild.name}</h4>
                        <p className="text-sm text-gray-500">
                          {guild.owner ? "Owner" : "Member"}
                          {guild.setupRequired && " • Setup required"}
                        </p>
                      </div>
                      {selectedGuildId === guild.id && (
                        <CheckCircle className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 border-t pt-6 text-center">
                <Button variant="outline" onClick={onInviteBot} size="sm" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Add to Another Server
                </Button>
              </div>
            </>
          )}
        </main>
      </DialogContent>
    </Dialog>
  );
}
