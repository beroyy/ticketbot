import Image from "next/image";
import { PartyPopper } from "lucide-react";
import { InlineCode } from "@/components/ui/typography";
import { GuildItem } from "./guild-item";

export const SetupInvite = () => (
  <div className="flex flex-col items-center space-y-4 text-center">
    <Image src="/shiny-icon.png" alt="shiny-icon" width={64} height={64} className="mr-2" />
    <div className="space-y-2">
      <h2 className="text-strong-black text-3xl font-medium tracking-tight">Invite TicketsBot</h2>
      <p className="text-sub-gray">You'll need admin access to complete this step</p>
    </div>
  </div>
);

export const SetupRequired = () => (
  <div className="flex flex-col items-center space-y-4 rounded-lg p-3">
    <h2 className="text-strong-black text-3xl font-medium tracking-tight">Almost done!</h2>
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
);

export const SetupComplete = () => (
  <div className="flex flex-col items-center space-y-7 pt-2">
    <Image src="/logo-blue.svg" alt="Logo" width={245} height={50} className="aspect-auto" />
    <div className="space-y-3 pt-2 text-center">
      <h2 className="text-strong-black text-3xl font-semibold tracking-tight">You're all set!</h2>
      <p className="text-sub-gray max-w-10/12 mx-auto text-pretty">
        Head into the dashboard to manage tickets, add staff and customize your setup.
      </p>
    </div>
  </div>
);

type Guild = {
  id: string;
  name: string;
  iconUrl?: string | null;
  owner: boolean;
  connected: boolean;
  setupRequired?: boolean;
};

type GuildListProps = {
  guilds: Guild[];
  selectedGuildId: string | null;
  onGuildSelect: (guildId: string) => void;
};

export const GuildList = ({ guilds, selectedGuildId, onGuildSelect }: GuildListProps) => (
  <div className="space-y-3 pb-0.5">
    <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">Your Servers</h3>
    {guilds.map((guild) => (
      <GuildItem
        key={guild.id}
        guild={guild}
        selectedGuildId={selectedGuildId}
        onSelect={onGuildSelect}
      />
    ))}
  </div>
);
