import Image from "next/image";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { FaDiscord } from "react-icons/fa6";
import { LoadingSpinner } from "@/components/loading-spinner";
import { withPublicRoute } from "@/lib/with-auth";
import type { InferGetServerSidePropsType } from "next";
import { BlurredLp } from "@/components/blurred-lp";
import { ChevronRight } from "lucide-react";

export const getServerSideProps = withPublicRoute();

type PageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

export default function Login(_props: PageProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);

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

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-[linear-gradient(120deg,#0e121b_0%,#052249_60%)]">
      <BlurredLp />
      <div className="rounded-20 fixed w-[35rem] border bg-white p-6 pt-12 shadow-lg">
        <div className="flex flex-col items-center gap-5 text-center">
          <Image src="/shiny-icon.png" alt="shiny-icon" width={70} height={70} className="mr-2" />
          <div className="space-y-2">
            <h2 className="text-strong-black text-pretty text-3xl font-semibold tracking-tight">
              Sign in with Discord
            </h2>
            <p className="text-sub-gray text-pretty tracking-tight">
              Connect your Discord account to manage support tickets
            </p>
          </div>
          <Button
            className="bg-dark-faded-blue hover:bg-dark-faded-blue/95 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-5 font-medium text-white transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C7EDB] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            onClick={handleSignUp}
            disabled={isRedirecting}
            data-signin-button
          >
            {isRedirecting ? (
              <LoadingSpinner className="h-5 w-5" />
            ) : (
              <>
                <FaDiscord className="size-5" />
                Sign in with Discord
                <ChevronRight className="size-4" strokeWidth={2.5} />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
