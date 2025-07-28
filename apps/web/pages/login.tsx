import Image from "next/image";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { FaDiscord } from "react-icons/fa6";

export default function Login() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  // Redirect if already authenticated
  useEffect(() => {
    if (session?.user) {
      router.push("/");
    }
  }, [session, router]);

  const handleSignUp = async () => {
    try {
      await authClient.signIn.social({
        provider: "discord",
      });
    } catch (error) {
      console.error("Error signing in:", error);
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

      <div className="md:min-w-2xl fixed rounded-2xl border bg-white p-6 shadow-lg">
        <div className="flex flex-col items-center space-y-4 text-center">
          <Image src="/shiny-icon.png" alt="shiny-icon" width={70} height={70} className="mr-2" />

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-gray-900">
              Sign in with Discord to get started
            </h2>
            <p className="text-gray-600">Connect your Discord account to manage support tickets</p>
          </div>

          <Button
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#5865F2] px-4 py-3 font-medium text-white hover:bg-[#4752C4]"
            onClick={handleSignUp}
          >
            <FaDiscord className="h-5 w-5" />
            Sign in with Discord
          </Button>
        </div>
      </div>
    </div>
  );
}
