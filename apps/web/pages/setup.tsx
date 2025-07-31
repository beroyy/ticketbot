import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useAuthCheck } from "@/features/user/hooks/use-auth-check";
import { LoadingSpinner } from "@/components/loading-spinner";

const discordInviteUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.NODE_ENV === "production" ? "1397412199869186090" : "1397414095753318522"}`;

export default function Setup() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [hasInvited, setHasInvited] = useState(false);
  const { hasGuilds, refetchGuilds } = useAuthCheck();
  const [isChecking, setIsChecking] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!session?.user) {
      router.push("/login");
    }
  }, [session, router]);

  // Redirect if guilds are found
  useEffect(() => {
    if (hasGuilds) {
      router.push("/");
    }
  }, [hasGuilds, router]);

  // Auto-check for guilds every 3 seconds after invite
  useEffect(() => {
    if (!hasInvited) return;

    const interval = setInterval(() => {
      refetchGuilds();
    }, 3000);

    return () => clearInterval(interval);
  }, [hasInvited, refetchGuilds]);

  const handleInviteBot = () => {
    setHasInvited(true);
    window.open(discordInviteUrl, "_blank");
  };

  const handleCheckServers = async () => {
    setIsChecking(true);
    await refetchGuilds();
    setIsChecking(false);
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

      <div className="md:min-w-2xl fixed rounded-2xl border bg-white p-6 shadow-lg">
        <div className="flex flex-col items-center space-y-4 text-center">
          <Image src="/shiny-icon.png" alt="shiny-icon" width={70} height={70} className="mr-2" />

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-gray-900">
              {hasInvited ? "Almost there!" : "Invite Ticketsbot to your server"}
            </h2>
            <p className="text-gray-600">
              {hasInvited
                ? "Once you've added the bot to your server, we'll automatically detect it"
                : "You'll need Admin access to complete this step"}
            </p>
          </div>

          {!hasInvited ? (
            <Button
              className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700"
              onClick={handleInviteBot}
            >
              Invite the Bot
            </Button>
          ) : (
            <div className="w-full space-y-3">
              <Button
                className="flex w-full items-center justify-center gap-2 rounded-md bg-gray-100 px-4 py-3 font-medium text-gray-700 hover:bg-gray-200"
                onClick={handleCheckServers}
                disabled={isChecking}
              >
                {isChecking ? (
                  <>
                    <LoadingSpinner className="h-4 w-4" />
                    Checking...
                  </>
                ) : (
                  "Check for Servers"
                )}
              </Button>

              <p className="text-xs text-gray-500">Checking automatically every few seconds...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
