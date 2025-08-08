import { useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { useAuth } from "@/features/auth/auth-provider-ssr";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import { CheckCircle, ExternalLink, Settings } from "lucide-react";
import { withAuthRoute } from "@/lib/with-auth";
import { fetchUserGuilds } from "@/lib/api-server";
import type { InferGetServerSidePropsType } from "next";
import { OnboardingDialog } from "@/components/onboarding-dialog";
import { BlurredLp } from "@/components/blurred-lp";
import { useHideScrollbar } from "@/hooks";
import { env } from "@/env";

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

export default function SetupPage({ guilds = [] }: PageProps) {
  const router = useRouter();
  const { setSelectedGuildId } = useAuth();
  const [currentStep, setCurrentStep] = useState<SetupStep>("select-guild");
  const [selectedGuild, setSelectedGuild] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { isClient } = useHideScrollbar();

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
    setIsRedirecting(true);
    setTimeout(() => {
      setIsRedirecting(false);
    }, 500);

    setCurrentStep("configure-guild");
    window.open(env.discordInviteUrl, "_blank");
  };

  const connectedGuilds = guilds.filter((g) => g.connected);
  const ownedGuilds = guilds.filter((g) => g.owner);
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
            <OnboardingDialog
              heroImage={<Image src="/logo-blue.svg" alt="Ticketsbot" width={280} height={80} />}
              title="Invite the bot to your server"
              description="You will need admin access to complete this step"
              isLoading={isRedirecting}
              onButtonPress={handleInviteBotPress}
              buttonDisabled={isRedirecting}
              buttonText="Invite Ticketsbot"
              buttonClassName="fancy-button hover:opacity-90 hover:transition-opacity hover:duration-500 hover:ease-in-out"
            />
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Your servers with TicketsBot:</h3>
              {connectedGuilds.map((guild) => (
                <button
                  key={guild.id}
                  onClick={() => handleGuildSelect(guild.id)}
                  className="w-full rounded-lg border border-gray-200 p-4 text-left transition-all hover:border-blue-500 hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    {guild.iconUrl ? (
                      <img src={guild.iconUrl} alt={guild.name} className="size-12 rounded-full" />
                    ) : (
                      <div className="flex size-12 items-center justify-center rounded-full bg-gray-200">
                        <span className="text-lg font-semibold text-gray-600">{guild.name[0]}</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold">{guild.name}</h4>
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

              <div className="mt-6 text-center">
                <Button variant="outline" onClick={handleInviteBotPress} className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Add to Another Server
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {currentStep === "configure-guild" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 p-4">
            <h3 className="mb-2 font-semibold text-blue-900">Initial Setup Required</h3>
            <p className="text-sm text-blue-700">
              This server needs to be configured before you can use TicketsBot.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm">Create support channels</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm">Set up permissions</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm">Configure ticket categories</span>
            </div>
          </div>

          <Button onClick={handleConfigureComplete} className="w-full" size="lg">
            Complete Setup
          </Button>
        </div>
      )}

      {currentStep === "complete" && (
        <div className="text-center">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <p className="text-gray-600">Redirecting to your dashboard...</p>
          <LoadingSpinner className="mx-auto mt-4" />
        </div>
      )}
    </div>
  );
}
