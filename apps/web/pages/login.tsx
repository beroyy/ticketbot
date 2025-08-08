import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { withPublicRoute } from "@/lib/with-auth";
import type { InferGetServerSidePropsType } from "next";
import { BlurredLp } from "@/components/blurred-lp";
import { OnboardingDialog } from "@/components/onboarding-dialog";
import { useHideScrollbar } from "@/hooks";

export const getServerSideProps = withPublicRoute();

type PageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

export default function LoginPage(_props: PageProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { isClient } = useHideScrollbar();

  const handleSignUp = async () => {
    try {
      setIsRedirecting(true);

      await authClient.signIn.social({
        provider: "discord",
        callbackURL: typeof window !== "undefined" ? window.location.origin : undefined,
      });
    } catch (error) {
      console.error("Error signing in:", error);
      setIsRedirecting(false);
    }
  };

  if (!isClient) return null;

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[linear-gradient(120deg,#0e121b_0%,#052249_60%)]">
      <BlurredLp />
      <OnboardingDialog
        title="Sign in with Discord"
        description="Connect your Discord account to manage support tickets"
        isLoading={isRedirecting}
        onButtonPress={handleSignUp}
        buttonDisabled={isRedirecting}
        buttonText="Sign in with Discord"
      />
    </div>
  );
}
