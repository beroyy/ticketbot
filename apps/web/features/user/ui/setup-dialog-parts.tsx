import { Button } from "@/components/ui/button";
import { DialogDescription, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Loader, ChevronRight } from "lucide-react";
import { FaDiscord } from "react-icons/fa6";

type SetupState =
  | { type: "invite" }
  | { type: "setup-required" }
  | { type: "setup-complete" }
  | { type: "select-guild"; ownedGuilds: any[] };

type SetupDialogHeaderProps = {
  state: SetupState;
};

export const SetupDialogHeader = ({ state }: SetupDialogHeaderProps) => {
  if (state.type === "setup-complete") return null;

  const getTitle = () => {
    switch (state.type) {
      case "invite":
        return "Let's Get Started";
      case "setup-required":
      case "select-guild":
        return "Finish Setup";
      default:
        return "";
    }
  };

  const getDescription = () => {
    switch (state.type) {
      case "invite":
        return "It takes just 10 seconds to get setup";
      case "setup-required":
      case "select-guild":
        return "You're just about ready to go";
      default:
        return "";
    }
  };

  return (
    <DialogHeader className="flex flex-row items-start justify-between space-y-0 border-b border-gray-200 p-6 pt-[30px] text-left">
      <div className="flex items-center gap-4">
        <div className="flex shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white p-2">
          <FaDiscord className="size-6 text-[#5865f2]" />
        </div>
        <div>
          <DialogTitle className="text-strong-black text-lg font-semibold">
            {getTitle()}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#525866]">
            {getDescription()}
          </DialogDescription>
        </div>
      </div>
    </DialogHeader>
  );
};

type SetupDialogFooterProps = {
  state: SetupState;
  onInvite: () => void;
  onGoToDashboard: () => void;
};

export const SetupDialogFooter = ({ state, onInvite, onGoToDashboard }: SetupDialogFooterProps) => (
  <DialogFooter className="flex flex-col gap-3 rounded-2xl px-7 pb-[30px] sm:flex-row">
    {state.type === "setup-complete" && (
      <Button
        className="bg-dark-faded-blue hover:bg-dark-faded-blue/90 flex flex-1 items-center justify-center gap-2 rounded-xl py-5 text-sm font-medium text-white"
        onClick={onGoToDashboard}
      >
        <p>Go to Dashboard</p>
        <ChevronRight className="size-3.5" strokeWidth={2.5} />
      </Button>
    )}
    {state.type === "setup-required" && (
      <div className="mx-auto flex animate-pulse items-center justify-center rounded-lg">
        <p className="text-sub-gray text-center text-sm">Checking server setup</p>
        <Loader className="ml-2 size-4" />
      </div>
    )}
    {state.type === "invite" && (
      <Button
        className="bg-dark-faded-blue hover:bg-dark-faded-blue/90 flex flex-1 items-center justify-center gap-2 rounded-xl py-5 text-sm font-medium text-white"
        onClick={onInvite}
      >
        <FaDiscord className="size-5" />
        <p className="leading-0 -translate-y-[1px]">Invite TicketsBot</p>
        <ChevronRight className="size-3.5" strokeWidth={2.5} />
      </Button>
    )}
  </DialogFooter>
);
