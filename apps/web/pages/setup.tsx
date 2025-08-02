import Image from "next/image";
import { useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { useGuildData } from "@/features/user/hooks/use-guild-data";
import { ServerSetupDialog } from "@/features/user/ui/server-setup-dialog";
import { Inter_Tight } from "next/font/google";
import { cn } from "@/lib/utils";
import { useSetupState } from "@/shared/stores/helpers";

const interTight = Inter_Tight({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

const discordInviteUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.NODE_ENV === "production" ? "1397412199869186090" : "1397414095753318522"}`;

export default function Setup() {
  const { setSelectedGuildId } = useAuth();
  const [selectedGuildId, setSelectedGuildIdLocal] = useState<string | null>(null);
  const { guilds, isLoading } = useGuildData({ enablePolling: true });

  const handleGuildSelect = (guildId: string) => {
    setSelectedGuildIdLocal(guildId);
    setSelectedGuildId(guildId);

    const selectedGuild = guilds.find((g) => g.id === guildId);
    if (selectedGuild && !selectedGuild.setupRequired) {
      useSetupState.setState("complete");
    } else if (selectedGuild?.setupRequired) {
      useSetupState.setState("configuring");
    }
  };

  const handleInviteBot = () => {
    window.open(discordInviteUrl, "_blank");
  };

  return (
    <div
      className={cn(
        `${interTight.className} relative flex h-screen w-full items-center justify-center`
      )}
    >
      <Image
        src="/blurred-lp-bg.png"
        alt="blurred-bg"
        className="absolute inset-0 size-full"
        width={1440}
        height={900}
        priority
        draggable={false}
      />
      <ServerSetupDialog
        guilds={guilds}
        isLoading={isLoading}
        selectedGuildId={selectedGuildId}
        onGuildSelect={handleGuildSelect}
        onInviteBot={handleInviteBot}
      />
    </div>
  );
}
