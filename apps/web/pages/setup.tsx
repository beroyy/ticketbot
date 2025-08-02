import Image from "next/image";
import { useRouter } from "next/router";
import { useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { useGuildData } from "@/features/user/hooks/use-guild-data";
import { SelectServerModal } from "@/features/user/ui/select-server-modal";
import { Inter_Tight } from "next/font/google";
import { cn } from "@/lib/utils";

const interTight = Inter_Tight({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

const discordInviteUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.NODE_ENV === "production" ? "1397412199869186090" : "1397414095753318522"}`;

export default function Setup() {
  const router = useRouter();
  const { setSelectedGuildId } = useAuth();
  const [selectedGuildId, setSelectedGuildIdLocal] = useState<string | null>(null);

  // Fetch guild data at page level with polling enabled
  const { guilds, isLoading } = useGuildData({ enablePolling: true });

  const handleGuildSelect = (guildId: string) => {
    setSelectedGuildIdLocal(guildId);
    setSelectedGuildId(guildId);
    // When a guild is selected and setup is complete, navigate to dashboard
    const selectedGuild = guilds.find((g) => g.id === guildId);
    if (selectedGuild && !selectedGuild.setupRequired) {
      router.push("/");
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
        width={1440}
        height={900}
        priority
        draggable={false}
        className="absolute inset-0 h-full w-full"
      />

      <SelectServerModal
        isOpen={true}
        onOpenChange={() => {}}
        guilds={guilds}
        isLoading={isLoading}
        selectedGuildId={selectedGuildId}
        onGuildSelect={handleGuildSelect}
        onInviteBot={handleInviteBot}
      />
    </div>
  );
}
