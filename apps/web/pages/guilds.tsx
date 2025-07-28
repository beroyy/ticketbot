import Image from "next/image";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/auth-provider";
import { LoadingSpinner } from "@/components/loading-spinner";
import { toast } from "sonner";

interface Guild {
  id: string;
  name: string;
  icon?: string | null;
  owner: boolean;
  permissions: string;
}

export default function Guilds() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { setSelectedGuildId } = useAuth();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!session?.user) {
      router.push("/login");
    }
  }, [session, router]);

  // Fetch available guilds
  useEffect(() => {
    const fetchGuilds = async () => {
      if (!session?.user) return;
      
      try {
        const res = await api.discord.guilds.$get();
        if (!res.ok) throw new Error("Failed to fetch guilds");
        const data = await res.json();
        
        if (data.guilds && data.guilds.length > 0) {
          setGuilds(data.guilds);
        } else {
          // No guilds found, redirect to setup
          router.push("/setup");
        }
      } catch (error) {
        console.error("Error fetching guilds:", error);
        toast.error("Failed to load servers. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchGuilds();
  }, [session, router]);

  const handleGuildSelect = async (guildId: string) => {
    setSelecting(true);
    try {
      // Set the selected guild
      setSelectedGuildId(guildId);
      
      // Redirect to dashboard
      await router.push("/");
    } catch (error) {
      console.error("Error selecting guild:", error);
      toast.error("Failed to select server. Please try again.");
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-gray-50">
      <Image
        src="/blurred-lp-bg.png"
        alt="blurred-bg"
        width={1440}
        height={900}
        priority
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="relative z-10 w-full max-w-2xl rounded-2xl border bg-white p-8 shadow-lg">
        <div className="flex flex-col items-center space-y-6">
          <Image src="/shiny-icon.png" alt="shiny-icon" width={70} height={70} />

          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-semibold text-gray-900">
              Select a Server
            </h2>
            <p className="text-gray-600">Choose which server you want to manage</p>
          </div>

          <div className="grid w-full gap-3">
            {guilds.map((guild) => (
              <Button
                key={guild.id}
                variant="outline"
                className="h-auto w-full justify-start gap-3 p-4 hover:bg-gray-50"
                onClick={() => handleGuildSelect(guild.id)}
                disabled={selecting}
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gray-200">
                  {guild.icon ? (
                    <img
                      src={guild.icon}
                      alt={guild.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-gray-600">
                      {guild.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{guild.name}</span>
                  {guild.owner && (
                    <span className="text-xs text-gray-500">Owner</span>
                  )}
                </div>
              </Button>
            ))}
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Don't see your server?{" "}
              <a
                href="/setup"
                className="text-blue-600 hover:underline"
              >
                Add the bot to a server
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
