import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { useAuth } from "@/features/auth";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import { CheckCircle, ExternalLink, Settings, AlertCircle, PartyPopper, RefreshCw } from "lucide-react";
import { withAuthRoute } from "@/lib/with-auth";
import { fetchUserGuilds } from "@/lib/api-server";
import type { InferGetServerSidePropsType } from "next";
import { OnboardingDialog } from "@/components/onboarding-dialog";
import { BlurredLp } from "@/components/blurred-lp";
import { useHideScrollbar } from "@/hooks";
import { env } from "@/env";
import { useUserGuilds } from "@/features/user/queries";
import { InlineCode } from "@/components/ui/typography";

type SetupStep = "select-guild" | "configure-guild" | "complete";

export const getServerSideProps = withAuthRoute(async (context, _session) => {
  const guilds = await fetchUserGuilds(context.req);
  return {
    props: {
      guilds,
    },
  };
});

type PageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

export default function SetupPage({ guilds: initialGuilds = [] }: PageProps) {
  const router = useRouter();
  const { setSelectedGuildId } = useAuth();
  const [currentStep, setCurrentStep] = useState<SetupStep>("select-guild");
  const [selectedGuild, setSelectedGuild] = useState<string | null>(null);
  const [isWaitingForBot, setIsWaitingForBot] = useState(false);
  const [waitStartTime, setWaitStartTime] = useState<number | null>(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const { isClient } = useHideScrollbar();

  // Use client-side query for refreshing
  const { data: freshGuilds, isLoading: isRefreshing, refetch } = useUserGuilds();

  // Use fresh guilds if available, otherwise use initial SSR guilds
  const guilds = freshGuilds || initialGuilds;

  const handleGuildSelect = async (guildId: string) => {
    const guild = guilds.find((g) => g.id === guildId);
    if (!guild) return;

    setSelectedGuild(guildId);

    if (guild.setupRequired) {
      setCurrentStep("configure-guild");
    } else {
      setSelectedGuildId(guildId);
      setCurrentStep("complete");

      // Set cookie for server-side auth
      document.cookie = `ticketsbot-selected-guild=${guildId}; path=/; max-age=604800`;

      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    }
  };

  const handleCheckSetupStatus = useCallback(async () => {
    if (!selectedGuild) return;
    
    const result = await refetch();
    const guild = result.data?.find((g) => g.id === selectedGuild);
    
    if (guild && !guild.setupRequired) {
      // Setup is complete, proceed to dashboard
      setSelectedGuildId(selectedGuild);
      setCurrentStep("complete");
      document.cookie = `ticketsbot-selected-guild=${selectedGuild}; path=/; max-age=604800`;
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    }
    // If still requires setup, stay on this step
  }, [selectedGuild, refetch, router, setSelectedGuildId]);

  const handleConfigureComplete = () => {
    if (selectedGuild) {
      setSelectedGuildId(selectedGuild);
      setCurrentStep("complete");

      document.cookie = `ticketsbot-selected-guild=${selectedGuild}; path=/; max-age=604800`;

      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    }
  };

  const handleInviteBotPress = () => {
    setIsWaitingForBot(true);
    setWaitStartTime(Date.now());
    setHasTimedOut(false);
    window.open(env.discordInviteUrl, "_blank");
  };

  const handleRefresh = useCallback(async () => {
    const result = await refetch();

    // Check if bot was added
    const connectedGuilds = result.data?.filter((g) => g.connected) || [];
    if (connectedGuilds.length > 0) {
      // Bot was added! Reset waiting state
      setIsWaitingForBot(false);
      setWaitStartTime(null);
      setHasTimedOut(false);
    }
  }, [refetch]);

  // Page visibility detection for auto-refresh
  useEffect(() => {
    if (!isWaitingForBot) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isWaitingForBot) {
        handleRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isWaitingForBot, handleRefresh]);

  // Timeout handling - 60 seconds
  useEffect(() => {
    if (!waitStartTime) return;

    const checkTimeout = setInterval(() => {
      const elapsed = Date.now() - waitStartTime;
      if (elapsed > 60000) {
        // 60 seconds
        setHasTimedOut(true);
        clearInterval(checkTimeout);
      }
    }, 1000);

    return () => clearInterval(checkTimeout);
  }, [waitStartTime]);

  const connectedGuilds = guilds.filter((g) => g.connected);
  const _ownedGuilds = guilds.filter((g) => g.owner);
  const hasAnyBotInstalled = connectedGuilds.length > 0;

  if (!isClient) return null;

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[linear-gradient(120deg,#0e121b_0%,#052249_60%)]">
      <BlurredLp />

      {/* <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">
            {currentStep === "select-guild" && "Select Your Server"}
            {currentStep === "configure-guild" && "Configure TicketsBot"}
            {currentStep === "complete" && "Setup Complete!"}
          </CardTitle>
          <CardDescription>
            {currentStep === "select-guild" && "Choose a server to manage with TicketsBot"}
            {currentStep === "configure-guild" && "Let's get your server set up"}
            {currentStep === "complete" && "You're all set! Redirecting to dashboard..."}
          </CardDescription>
        </CardHeader> */}

      {currentStep === "select-guild" && (
        <>
          {!hasAnyBotInstalled ? (
            <>
              {hasTimedOut ? (
                // Timeout message
                <div className="rounded-20 fixed left-1/2 top-1/2 z-20 w-[35rem] -translate-x-1/2 -translate-y-1/2 border bg-white p-6 pt-12 shadow-lg">
                  <div className="flex flex-col items-center gap-5 text-center">
                    <div className="flex size-16 items-center justify-center rounded-full bg-yellow-100">
                      <AlertCircle className="size-8 text-yellow-600" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-strong-black text-pretty text-3xl font-semibold tracking-tight">
                        Taking longer than expected
                      </h2>
                      <p className="text-sub-gray text-pretty tracking-tight">
                        Please ensure you've completed the bot invitation in Discord. The bot needs
                        Administrator permissions.
                      </p>
                    </div>
                    <div className="flex w-full flex-col gap-3">
                      <Button
                        className="bg-dark-faded-blue hover:bg-dark-faded-blue/95 w-full"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                      >
                        {isRefreshing ? <LoadingSpinner className="size-5" /> : "Check Again"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setHasTimedOut(false);
                          setWaitStartTime(Date.now());
                          window.open(env.discordInviteUrl, "_blank");
                        }}
                        className="w-full"
                      >
                        Try Inviting Again
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <OnboardingDialog
                  heroImage={
                    <Image src="/logo-blue.svg" alt="Ticketsbot" width={280} height={80} />
                  }
                  title={isWaitingForBot ? undefined : "Invite the bot to your server"}
                  description={
                    isWaitingForBot ? undefined : "You will need admin access to complete this step"
                  }
                  isLoading={isRefreshing}
                  onButtonPress={handleInviteBotPress}
                  buttonDisabled={isRefreshing}
                  buttonText="Invite Ticketsbot"
                  buttonClassName="fancy-button hover:opacity-90 hover:transition-opacity hover:duration-500 hover:ease-in-out"
                  isWaiting={isWaitingForBot}
                  onRefresh={handleRefresh}
                />
              )}
            </>
          ) : (
            // Guild selection dialog
            <div className="rounded-20 fixed left-1/2 top-1/2 z-20 w-[35rem] -translate-x-1/2 -translate-y-1/2 border bg-white p-6 shadow-lg">
              <div className="flex flex-col gap-5">
                <div className="text-center">
                  <h2 className="text-strong-black text-pretty text-3xl font-semibold tracking-tight">
                    Select Your Server
                  </h2>
                  <p className="text-sub-gray mt-2 text-pretty tracking-tight">
                    Choose a server to manage with TicketsBot
                  </p>
                </div>

                <div className="max-h-[400px] space-y-3 overflow-y-auto">
                  {connectedGuilds.map((guild) => (
                    <button
                      key={guild.id}
                      onClick={() => handleGuildSelect(guild.id)}
                      className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition-all duration-200 hover:border-blue-500 hover:bg-blue-50/50"
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
                          <h4 className="font-semibold text-gray-900">{guild.name}</h4>
                          <p className="text-sm text-gray-500">
                            {guild.setupRequired ? "Needs configuration" : "Ready to use"}
                          </p>
                        </div>
                        {guild.setupRequired ? (
                          <Settings className="h-5 w-5 text-orange-500" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="text-center">
                  <Button variant="outline" onClick={handleInviteBotPress} className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Add to Another Server
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {currentStep === "configure-guild" && (() => {
        const currentGuild = guilds.find((g) => g.id === selectedGuild);
        const isSetupComplete = currentGuild && !currentGuild.setupRequired;
        
        return (
          <div className="rounded-20 fixed left-1/2 top-1/2 z-20 w-[35rem] -translate-x-1/2 -translate-y-1/2 border bg-white p-6 shadow-lg">
            <div className="flex flex-col items-center space-y-4 rounded-lg p-3">
              <h2 className="text-strong-black text-3xl font-medium tracking-tight">Almost done!</h2>
              <p className="text-sub-gray mx-auto text-pretty text-center leading-loose">
                {isSetupComplete ? (
                  <>
                    Setup complete! You can now continue to the dashboard{" "}
                    <span className="inline-block">
                      <CheckCircle className="text-green-500 size-5 translate-y-0.5" />
                    </span>
                  </>
                ) : (
                  <>
                    TicketsBot was successfully installed. <br />
                    Run{" "}
                    <InlineCode className="text-strong-black bg-[#f3f3f3] text-center font-mono text-sm font-light">
                      /setup auto
                    </InlineCode>{" "}
                    to finish setup{" "}
                    <span className="inline-block">
                      <PartyPopper className="text-sub-gray/80 size-5 translate-y-0.5" />
                    </span>
                  </>
                )}
              </p>
              
              <Button
                onClick={isSetupComplete ? handleConfigureComplete : handleCheckSetupStatus}
                className="bg-dark-faded-blue hover:bg-dark-faded-blue/95 mt-4 w-full"
                size="lg"
                disabled={isRefreshing}
              >
                {isSetupComplete ? (
                  "Continue to Dashboard"
                ) : (
                  <>
                    <RefreshCw className={`mr-2 size-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    Check Status
                  </>
                )}
              </Button>
            </div>
          </div>
        );
      })()}

      {currentStep === "complete" && (
        <div className="rounded-20 fixed left-1/2 top-1/2 z-20 w-[35rem] -translate-x-1/2 -translate-y-1/2 border bg-white p-6 shadow-lg">
          <div className="flex flex-col items-center gap-5 text-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <div>
              <h2 className="text-strong-black text-pretty text-3xl font-semibold tracking-tight">
                Setup Complete!
              </h2>
              <p className="text-sub-gray mt-2 text-pretty tracking-tight">
                Redirecting to your dashboard...
              </p>
            </div>
            <LoadingSpinner className="size-8" />
          </div>
        </div>
      )}
    </div>
  );
}
