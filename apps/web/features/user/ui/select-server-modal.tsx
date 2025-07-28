import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Modal, ModalHeader, ModalContent, ModalFooter } from "@/components/ui/modal";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";

interface Guild {
  id: string;
  name: string;
  icon?: string | null;
  owner: boolean;
  permissions: string;
}

interface SelectServerModalProps {
  isOpen: boolean;
  onGuildSelect: (guildId: string) => void;
}

// Custom error types for better error handling
interface DiscordConnectionError {
  type: "discord_not_connected";
  message: string;
}

interface GenericError {
  type: "generic";
  message: string;
}

type FetchError = DiscordConnectionError | GenericError;

export function SelectServerModal({ isOpen, onGuildSelect }: SelectServerModalProps) {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FetchError | null>(null);

  const fetchGuilds = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.discord.guilds.$get();
      if (!res.ok) throw new Error("Failed to fetch guilds");
      const data = await res.json();

      // Handle the new response format
      if (!data.connected || data.error) {
        setError({
          type: "discord_not_connected",
          message:
            data.error ||
            "Your Discord account is not connected. Please connect your Discord account to continue.",
        });
        setGuilds([]);
        return;
      }

      setGuilds(data.guilds);
      if (data.guilds.length > 0) {
        const firstGuild = data.guilds[0];
        if (firstGuild) {
          setSelectedGuildId(firstGuild.id);
        }
      }
    } catch (err) {
      logger.error("Error fetching guilds:", err);

      // Handle legacy error format and network errors
      if (err instanceof Error) {
        if (err.message.includes("Discord account not connected")) {
          setError({
            type: "discord_not_connected",
            message:
              "Your Discord account is not connected. Please connect your Discord account to continue.",
          });
        } else {
          setError({
            type: "generic",
            message: "Failed to load your Discord servers. Please try again.",
          });
        }
      } else {
        setError({
          type: "generic",
          message: "Failed to load your Discord servers. Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void fetchGuilds();
    }
  }, [isOpen]);

  const handleContinue = () => {
    if (selectedGuildId) {
      onGuildSelect(selectedGuildId);
    }
  };

  const handleConnectDiscord = async () => {
    try {
      await authClient.signIn.social({
        provider: "discord",
      });
    } catch (error) {
      logger.error("Error connecting Discord:", error);
      setError({
        type: "generic",
        message: "Failed to connect Discord account. Please try again.",
      });
    }
  };

  const getGuildIconUrl = (guild: Guild) => {
    if (!guild.icon) return null;
    // If it's already a full URL, just add the size parameter
    if (guild.icon.startsWith("https://")) {
      return guild.icon.replace(".png", ".png?size=128");
    }
    // Otherwise construct the URL from the hash
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`;
  };

  return (
    <Modal isOpen={isOpen} dismissible={false} className="max-w-4xl">
      <ModalHeader>
        <h2 className="text-lg font-semibold text-gray-900">Select Discord Server</h2>
      </ModalHeader>

      <ModalContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select the Discord server you&apos;d like to manage tickets for:
          </p>

          {loading && (
            <div className="py-8 text-center">
              <div className="text-gray-500">Loading your servers...</div>
            </div>
          )}

          {error && error.type === "discord_not_connected" && (
            <div className="py-8 text-center">
              <div className="mb-4 text-sm text-amber-600">{error.message}</div>
              <Button
                onClick={handleConnectDiscord}
                className="bg-[#5865F2] text-white hover:bg-[#4752C4]"
              >
                Connect Discord Account
              </Button>
            </div>
          )}

          {error && error.type === "generic" && (
            <div className="py-4 text-center">
              <div className="text-sm text-red-500">{error.message}</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void fetchGuilds();
                }}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && guilds.length === 0 && (
            <div className="py-8 text-center">
              <div className="text-sm text-gray-500">
                No Discord servers found. Make sure you have the bot added to your server.
              </div>
            </div>
          )}

          {!loading && !error && guilds.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {guilds.map((guild) => (
                <div
                  key={guild.id}
                  onClick={() => {
                    setSelectedGuildId(guild.id);
                  }}
                  className={`cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 ${
                    selectedGuildId === guild.id
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex flex-col items-center space-y-3 text-center">
                    {getGuildIconUrl(guild) ? (
                      <div className="relative">
                        <Image
                          src={getGuildIconUrl(guild) || ""}
                          alt={`${guild.name} icon`}
                          width={64}
                          height={64}
                          className="h-16 w-16 rounded-full ring-2 ring-gray-200"
                        />
                        {selectedGuildId === guild.id && (
                          <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
                            <svg
                              className="h-3 w-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gray-300 to-gray-400 ring-2 ring-gray-200">
                          <span className="text-xl font-bold text-white">
                            {guild.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        {selectedGuildId === guild.id && (
                          <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
                            <svg
                              className="h-3 w-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="w-full">
                      <p className="truncate text-sm font-semibold text-gray-900">{guild.name}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ModalContent>

      <ModalFooter>
        <Button
          onClick={handleContinue}
          disabled={!selectedGuildId || loading}
          className="w-full bg-blue-600 text-white hover:bg-blue-700"
        >
          Continue
        </Button>
      </ModalFooter>
    </Modal>
  );
}
