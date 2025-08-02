import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useInitialSetupComplete } from "@/shared/stores/helpers";
import { useSetupState } from "../hooks/use-setup-state";
import { SetupInvite, SetupRequired, SetupComplete, GuildList } from "./setup-states";
import { SetupDialogHeader, SetupDialogFooter } from "./setup-dialog-parts";

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

export const ServerSetupDialog = ({
  guilds,
  isLoading,
  selectedGuildId,
  onGuildSelect,
  onInviteBot,
}: ServerSetupDialogProps) => {
  const state = useSetupState(guilds);

  const handleGoToDashboard = () => {
    const configuredGuild = guilds.find((g) => !g.setupRequired && g.connected);
    if (configuredGuild) {
      onGuildSelect(configuredGuild.id);
    }
    useInitialSetupComplete.setState(false, true);
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        showOverlay={false}
        className="fixed mx-auto w-full max-w-md rounded-3xl border border-none bg-white p-0 shadow-lg md:min-w-fit"
      >
        <SetupDialogHeader state={state} />

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
              {state.type === "invite" && <SetupInvite />}
              {state.type === "setup-required" && <SetupRequired />}
              {state.type === "setup-complete" && <SetupComplete />}
              {state.type === "select-guild" && (
                <GuildList
                  guilds={state.ownedGuilds}
                  selectedGuildId={selectedGuildId}
                  onGuildSelect={onGuildSelect}
                />
              )}
            </div>
          )}
        </main>

        <SetupDialogFooter
          state={state}
          onInvite={onInviteBot}
          onGoToDashboard={handleGoToDashboard}
        />
      </DialogContent>
    </Dialog>
  );
};
