import Image from "next/image";
import { useRouter } from "next/router";
import { useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { useGuildData } from "@/features/user/hooks/use-guild-data";
import { SelectServerModal } from "@/features/user/ui/select-server-modal";

const discordInviteUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.NODE_ENV === "production" ? "1397412199869186090" : "1397414095753318522"}`;

export default function Setup() {
  const router = useRouter();
  const { setSelectedGuildId } = useAuth();
  const [selectedGuildId, setSelectedGuildIdLocal] = useState<string | null>(null);

  // Fetch guild data at page level
  const { guilds, isLoading } = useGuildData();

  const handleGuildSelect = (guildId: string) => {
    setSelectedGuildIdLocal(guildId);
    setSelectedGuildId(guildId);
    router.push("/");
  };

  const handleInviteBot = () => {
    window.open(discordInviteUrl, "_blank");
  };

  return (
    <div className="relative flex h-screen w-full items-center justify-center">
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
