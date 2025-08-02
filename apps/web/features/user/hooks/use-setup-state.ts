import { useMemo, useEffect } from "react";
import { useInitialSetupComplete } from "@/shared/stores/helpers";

type Guild = {
  id: string;
  name: string;
  iconUrl?: string | null;
  owner: boolean;
  connected: boolean;
  setupRequired?: boolean;
};

type SetupState =
  | { type: "invite" }
  | { type: "setup-required" }
  | { type: "setup-complete" }
  | { type: "select-guild"; ownedGuilds: Guild[] };

export function useSetupState(guilds: Guild[]) {
  const initialSetupComplete = useInitialSetupComplete();

  const state = useMemo<SetupState>(() => {
    const ownedGuilds = guilds.filter((g) => g.owner);
    const hasAnyBotInstalled = guilds.some((g) => g.connected);
    const setupRequired = hasAnyBotInstalled && guilds.some(({ setupRequired }) => setupRequired);
    const hasConfiguredGuild = guilds.some((g) => g.connected && !g.setupRequired);
    const showSetupComplete = initialSetupComplete && hasConfiguredGuild && !setupRequired;

    if (!hasAnyBotInstalled) return { type: "invite" };
    if (setupRequired) return { type: "setup-required" };
    if (showSetupComplete) return { type: "setup-complete" };
    return { type: "select-guild", ownedGuilds };
  }, [guilds, initialSetupComplete]);

  const hasConfiguredGuild = guilds.some((g) => g.connected && !g.setupRequired);

  useEffect(() => {
    if (hasConfiguredGuild && !initialSetupComplete) {
      useInitialSetupComplete.setState(true, true);
    }
  }, [hasConfiguredGuild, initialSetupComplete]);

  return state;
}
