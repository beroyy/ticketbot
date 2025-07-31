import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutList,
  X,
  ChevronLeft,
  Smile,
  Calendar,
  Shield,
  Crown,
  Users,
  Clock,
  Copy,
} from "lucide-react";
import type { Ticket } from "@/features/tickets/types";
import { useTicketMessages } from "@/features/tickets/queries";
import { ActivityLogModal } from "@/features/tickets/ui/activity-log-modal";
import { EmojiProgressIcon } from "@/components/emoji-progress-icon";
import { TicketMessages } from "@/features/tickets/ui/ticket-messages";
import { useSmartRefetch } from "@/hooks/use-smart-refetch";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { BiSolidArrowFromRight } from "react-icons/bi";

interface TicketDetailViewProps {
  ticket: Ticket;
  onClose: () => void;
}

// Extend dayjs with custom parse format plugin
dayjs.extend(customParseFormat);

function UserMetadataContent({ metadata }: { metadata: unknown }): React.JSX.Element {
  if (!metadata) return <div className="p-4 text-sm text-gray-500">No metadata available</div>;

  // Type guard for metadata
  const isObjectWithProp = (obj: unknown, prop: string): obj is Record<string, unknown> => {
    return obj !== null && typeof obj === "object" && prop in obj;
  };

  if (!isObjectWithProp(metadata, "displayName")) {
    return <div className="p-4 text-sm text-gray-500">Invalid metadata format</div>;
  }

  const metadataObj = metadata;

  // Get the guild data for the current guild (assuming first guild for demo)
  const guildData =
    isObjectWithProp(metadata, "guilds") && metadata["guilds"]
      ? (Object.values(metadata["guilds"])[0] as Record<string, unknown>)
      : null;

  const formatDate = (dateStr: string) => {
    return dayjs(dateStr).format("MMM D, YYYY");
  };

  const formatAge = (days: number) => {
    if (days < 30) return `${String(days)} days`;
    if (days < 365) return `${String(Math.floor(days / 30))} months`;
    return `${String(Math.floor(days / 365))} years`;
  };

  return (
    <div className="w-80 p-4">
      <h3 className="mb-3 font-semibold text-gray-900">User Information</h3>

      <div className="space-y-3 text-sm">
        {/* Display Name */}
        {typeof metadataObj["displayName"] === "string" && metadataObj["displayName"] && (
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Display Name:</span>
            <span className="font-medium">{metadataObj["displayName"]}</span>
          </div>
        )}

        {/* Account Age */}
        {typeof metadataObj["accountAgeInDays"] === "number" && metadataObj["accountAgeInDays"] && (
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Account Age:</span>
            <span className="font-medium">{formatAge(metadataObj["accountAgeInDays"])}</span>
          </div>
        )}

        {/* Account Created */}
        {typeof metadataObj["accountCreatedAt"] === "string" && metadataObj["accountCreatedAt"] && (
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Created:</span>
            <span className="font-medium">{formatDate(metadataObj["accountCreatedAt"])}</span>
          </div>
        )}

        {guildData && (
          <>
            <div className="mt-3 border-t pt-3">
              <h4 className="mb-2 font-medium text-gray-900">Server Information</h4>
            </div>

            {/* Server Join Date */}
            {guildData["joinedAt"] && (
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="text-gray-600">Joined Server:</span>
                <span className="font-medium">{formatDate(guildData["joinedAt"] as string)}</span>
              </div>
            )}

            {/* Server Age */}
            {guildData["serverAgeInDays"] && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-gray-600">Server Age:</span>
                <span className="font-medium">
                  {formatAge(guildData["serverAgeInDays"] as number)}
                </span>
              </div>
            )}

            {/* Booster Status */}
            {guildData["isBooster"] && (
              <div className="flex items-center space-x-2">
                <Crown className="h-4 w-4 text-purple-500" />
                <span className="text-gray-600">Server Booster</span>
                {typeof guildData["premiumSince"] === "string" && guildData["premiumSince"] && (
                  <span className="text-xs text-gray-500">
                    since {formatDate(guildData["premiumSince"])}
                  </span>
                )}
              </div>
            )}

            {/* Nickname */}
            {guildData["nickname"] && (
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-green-500" />
                <span className="text-gray-600">Nickname:</span>
                <span className="font-medium">{guildData["nickname"] as string}</span>
              </div>
            )}

            {/* Roles */}
            {Array.isArray(guildData["roles"]) && guildData["roles"].length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-orange-500" />
                  <span className="text-gray-600">Roles:</span>
                </div>
                <div className="ml-6 flex flex-wrap gap-1">
                  {Array.isArray(guildData["roles"]) &&
                    guildData["roles"]
                      .slice(0, 5)
                      .map((role: Record<string, unknown>, index: number) => (
                        <span
                          key={(role["id"] as string) || index}
                          className="inline-block rounded px-2 py-1 text-xs"
                          style={{
                            backgroundColor:
                              role["color"] !== "#000000"
                                ? (role["color"] as string) + "20"
                                : "#f3f4f6",
                            color:
                              role["color"] !== "#000000" ? (role["color"] as string) : "#6b7280",
                          }}
                        >
                          {role["name"] as string}
                        </span>
                      ))}
                  {Array.isArray(guildData["roles"]) && guildData["roles"].length > 5 && (
                    <span className="text-xs text-gray-500">
                      +{guildData["roles"].length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function TicketDetailView({ ticket, onClose }: TicketDetailViewProps) {
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const isCollapsed = false; // Can be added to global store if needed
  
  // Use smart refetch for critical message data
  const smartInterval = useSmartRefetch("critical");

  // Fetch real messages for this ticket
  const {
    data: messagesData,
    isLoading: messagesLoading,
    error: messagesError,
  } = useTicketMessages(ticket.id, smartInterval);

  const mockActions = [
    {
      id: 1,
      text: "Lorem Ipsum",
      description: "Lorem Ipsum is simply dummy text of the printing...",
      completed: true,
    },
    {
      id: 2,
      text: "Lorem Ipsum",
      description: "Lorem Ipsum is simply dummy text of the printing...",
      completed: false,
    },
    {
      id: 3,
      text: "Lorem Ipsum",
      description: "Lorem Ipsum is simply dummy text of the printing...",
      completed: false,
    },
    {
      id: 4,
      text: "Lorem Ipsum",
      description: "Lorem Ipsum is simply dummy text of the printing...",
      completed: false,
    },
  ];

  return (
    <div className="flex w-full">
      {!isCollapsed && (
        <div className="ml-6 h-[150%] -translate-y-1/4 border-l border-gray-200"></div>
      )}
      <div className="flex h-full flex-col bg-white pb-[74px]">
        {/* Header - Only collapse button and close button */}
        <div className="mt-1 bg-white px-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              className="p-1.5"
              onClick={() => {
                // Collapse functionality can be added to global store if needed
                console.log("Collapse toggle clicked");
              }}
            >
              <BiSolidArrowFromRight className="size-5" />
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="flex items-center space-x-2 px-2.5 py-1 text-base text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              <span>Close</span>
              <X className="size-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 gap-6 px-6 py-4">
          {/* Main Chat Area - Rounded Container */}
          <div className="nice-gray-border flex flex-1 flex-col rounded-2xl border bg-white">
            {/* User Info Header - Now inside main content area */}
            <div className="p-6">
              <div className="mb-4 flex items-center space-x-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-12 w-12 cursor-pointer rounded-full transition-all hover:ring-2 hover:ring-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {ticket.openerImage || ticket.openerAvatar ? (
                        <Image
                          src={ticket.openerImage || ticket.openerAvatar || ""}
                          alt={ticket.opener || "Ticket opener"}
                          className="size-full rounded-full object-cover"
                          width={48}
                          height={48}
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center rounded-full bg-orange-100">
                          <span className="font-medium text-orange-600">
                            {ticket.opener?.[0]?.toUpperCase() || "U"}
                          </span>
                        </div>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="p-0">
                    <UserMetadataContent metadata={ticket.openerMetadata} />
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {(ticket.openerMetadata as { displayName?: string } | null)?.displayName ||
                      ticket.opener ||
                      "Unknown User"}
                  </h2>
                  <p className="text-sm text-gray-500">{ticket.opener || "Unknown User"}</p>
                </div>
                <Button
                  variant="outline"
                  className="flex items-center space-x-1 border-gray-300 px-2.5 py-1.5 text-base hover:bg-gray-50"
                  onClick={() => {
                    setIsActivityLogOpen(true);
                  }}
                >
                  <LayoutList className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Activity Log</span>
                </Button>
              </div>
              <div className="border-t border-gray-200"></div>
            </div>
            <TicketMessages
              messages={messagesData}
              ticket={ticket}
              isLoading={messagesLoading}
              error={messagesError}
            />
          </div>

          {/* Right Sidebar - Rounded Container */}
          <div className="nice-gray-border flex w-1/2 flex-col rounded-2xl border bg-white">
            {/* Emotion Summary Section */}
            <div className="border-b p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Smile className="size-5 text-[#112744]" />
                  <span className="text-lg font-medium text-[#112744]">Emotion Summary</span>
                </div>
                <EmojiProgressIcon percentage={ticket.progress} size={44} strokeWidth={3} />
              </div>

              <h4 className="mb-2 font-medium text-gray-900">Summary</h4>
              <p className="mb-4 text-sm text-gray-700">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
                incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              <Button
                variant="default"
                className="w-full rounded-xl bg-[#E9ECFF] text-base text-[#103A71]"
              >
                <Copy className="size-4 scale-x-[-1]" />
                Copy Summary
              </Button>
            </div>

            {/* Actions Section */}
            <div className="flex-1 p-6">
              <h3 className="mb-4 font-medium text-gray-900">Actions to take</h3>
              <div className="space-y-3">
                {mockActions.map((action) => (
                  <div key={action.id} className="flex items-start space-x-3">
                    <div
                      className={`mt-1 h-4 w-4 flex-shrink-0 rounded-full border-2 ${
                        action.completed ? "border-gray-400 bg-gray-400" : "border-gray-300"
                      }`}
                    >
                      {action.completed && (
                        <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{action.text}</p>
                      <p className="text-xs text-gray-500">{action.description}</p>
                    </div>
                    <ChevronLeft className="h-4 w-4 rotate-180 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Activity Log Modal */}
        <ActivityLogModal
          isOpen={isActivityLogOpen}
          onClose={() => {
            setIsActivityLogOpen(false);
          }}
          ticket={ticket}
        />
      </div>
    </div>
  );
}
