import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Modal, ModalHeader, ModalContent, ModalFooter } from "@/components/ui/modal";
import { apiClient } from "@/lib/api";

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

export function SelectServerModal({ isOpen, onGuildSelect }: SelectServerModalProps) {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGuilds = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.get<Guild[]>("/discord/guilds");
      setGuilds(data);
      if (data.length > 0) {
        const firstGuild = data[0];
        if (firstGuild) {
          setSelectedGuildId(firstGuild.id);
        }
      }
    } catch (err) {
      setError("Failed to load your Discord servers");
      console.error("Error fetching guilds:", err);
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

          {error && (
            <div className="py-4 text-center">
              <div className="text-sm text-red-500">{error}</div>
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
