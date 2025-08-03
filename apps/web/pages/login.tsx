import Image from "next/image";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { FaDiscord } from "react-icons/fa6";
import { LoadingSpinner } from "@/components/loading-spinner";
import { withPublicRoute } from "@/lib/with-auth";
import type { InferGetServerSidePropsType } from "next";

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
      <div className="fixed w-96 rounded-2xl border bg-white p-6 shadow-lg">
        <div className="flex flex-col items-center space-y-4 text-center">
          <Image src="/shiny-icon.png" alt="shiny-icon" width={70} height={70} className="mr-2" />
          <div className="space-y-2">
            <h2 className="text-strong-black text-pretty text-2xl font-semibold tracking-tight">
              Sign in with Discord to get started
            </h2>
            <p className="text-sub-gray text-pretty tracking-tight">
              Connect your Discord account to manage support tickets
            </p>
          </div>
          <Button
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#5865F2] px-4 py-3 font-medium text-white transition-opacity duration-75 hover:bg-[#4752C4]"
            onClick={handleSignUp}
            disabled={isRedirecting}
            data-signin-button
          >
            {isRedirecting ? (
              <LoadingSpinner className="h-5 w-5" />
            ) : (
              <>
                <FaDiscord className="h-5 w-5" />
                Sign in with Discord
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
