"use client";

import Image from "next/image";
import {
  Hash,
  CheckCircle,
  Check,
  Lock,
  Users,
  Pin,
  Bell,
  AlignCenter,
  TriangleRight,
} from "lucide-react";
import { format } from "date-fns";

interface TicketChannelPreviewProps {
  welcomeMessage?: string;
  embedColor?: string;
  ticketNumber?: number;
  mentionedRoles?: string[];
  showMentions?: boolean;
  useNamingScheme?: boolean;
  ticketPrefix?: string;
}

export default function TicketChannelPreview({
  welcomeMessage = "Thank you for contacting support.\nPlease describe your issue and wait for a response.",
  embedColor = "#5865F2",
  ticketNumber = 9,
  mentionedRoles = ["Ticketsbot", "Tickets Support", "Tickets Admin"],
  showMentions = true,
  useNamingScheme = true,
  ticketPrefix = "ticket",
}: TicketChannelPreviewProps) {
  const now = new Date();
  const timeString = format(now, "h:mm a");
  const dateString = format(now, "MMMM d, yyyy");

  // Generate channel name based on naming scheme
  const channelName = useNamingScheme
    ? `${ticketPrefix}-${String(ticketNumber)}`
    : `${ticketPrefix}-user-${String(ticketNumber)}`;
  return (
    <div className="h-fit w-full overflow-hidden rounded-2xl bg-[#36393f] pr-3">
      {/* Channel Header */}
      <div className="border-b border-[#202225] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="size-5 text-[#72767d]" />
            <span className="font-semibold text-white">{channelName}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="rounded p-2">
              <AlignCenter
                className="size-4 rotate-45 text-[#b9bbbe]"
                strokeWidth={3}
                fill="#b9bbbe"
              />
            </div>
            <div className="rounded p-2">
              <Bell className="size-4 text-[#b9bbbe]" strokeWidth={3} fill="#b9bbbe" />
            </div>
            <div className="rounded p-2">
              <Pin className="size-4 rotate-45 text-[#b9bbbe]" strokeWidth={3} fill="#b9bbbe" />
            </div>
            <div className="rounded p-2">
              <Users className="size-4 text-white" strokeWidth={3} fill="white" />
            </div>
          </div>
        </div>
      </div>

      {/* Channel Content */}
      <div className="overflow-hidden p-4">
        {/* Welcome Section */}
        <div className="mb-6 pl-3">
          <div className="mb-2.5 flex size-16 items-center justify-center rounded-full bg-[#2C2D32]">
            <Hash className="size-10 text-white" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-white">Welcome to #{channelName}!</h1>
          <p className="text-sm text-[#b9bbbe]">
            This is the start of the{" "}
            <span className="font-semibold text-[#dcddde]">#{channelName}</span> private channel.
          </p>
        </div>

        {/* User Avatar */}
        <div className="mb-4 flex items-center gap-3 px-4">
          <div className="size-6 flex-shrink-0 overflow-hidden rounded-full">
            <Image
              src="/ezze.png"
              alt="User"
              width={24}
              height={24}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* Date Divider */}
        <div className="mb-4 flex items-center px-1">
          <div className="h-[1px] flex-1 bg-[#DA3E45]"></div>
          <span className="mx-1.5 text-xs font-bold text-[#DA3E45]">{dateString}</span>
          <div className="h-[1px] flex-1 bg-[#DA3E45]"></div>
          <div className="flex items-center">
            <TriangleRight className="-mr-1.5 size-3 rotate-[130deg] fill-[#DA3E45] text-[#DA3E45]" />
            <span className="rounded-sm bg-[#DA3E45] px-1 py-0.5 text-xs font-bold text-white">
              NEW
            </span>
          </div>
        </div>

        {/* Bot Message */}
        <div
          className={`-mx-4 flex gap-4 px-4 py-2 ${
            showMentions && mentionedRoles.length > 0
              ? "rounded-r-md border-l-4 border-[#CE9C5B] bg-[#27211C]"
              : ""
          }`}
        >
          {/* Bot Avatar */}
          <div className="flex-shrink-0">
            <div className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-[#5865F2]">
              <Image
                src="/logo-icon.svg"
                alt="Ticketsbot.ai"
                width={24}
                height={24}
                className="size-6"
              />
            </div>
          </div>

          {/* Message Content */}
          <div className="min-w-0 flex-1">
            {/* Bot Name and Badge */}
            <div className="mb-0.5 flex items-center gap-1.5">
              <span className="font-medium text-white">ticketsbot.ai</span>
              <div className="flex items-center gap-0.5 rounded bg-[#5865F2] px-1.5 py-0.5">
                <Check className="size-3 text-white" />
                <span className="text-xs font-medium text-white">APP</span>
              </div>
              <span className="text-xs text-[#72767d]">{timeString}</span>
            </div>

            {/* Mentioned Users */}
            {showMentions && mentionedRoles.length > 0 && (
              <div className="mb-2 flex w-fit items-center gap-1 text-xs text-[#72767d]">
                {mentionedRoles.map((role, index) => (
                  <div key={index} className="rounded bg-[#343459] px-1 py-0.5">
                    <span className="cursor-pointer text-[#93A7FD] hover:underline">
                      {role.startsWith("@") ? role : `@${role}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Welcome Message Embed */}
            <div
              className="max-w-md overflow-hidden rounded-md bg-[#2f3136]"
              style={{ borderLeft: `4px solid ${embedColor}` }}
            >
              <div className="p-4">
                <div className="whitespace-pre-wrap text-sm text-[#dcddde]">{welcomeMessage}</div>

                {/* Footer with logo */}
                <div className="mt-3 flex items-center gap-2 text-xs text-[#72767d]">
                  <Image
                    src="/logo-icon.svg"
                    alt="Ticketsbot"
                    width={16}
                    height={16}
                    className="size-4"
                  />
                  <span>Powered by ticketsbot.ai</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-3 flex gap-2">
              <button className="flex items-center gap-1 rounded-lg bg-[#da373c] px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#a12d31]">
                <Lock className="size-4" strokeWidth={3} />
                <span>Close</span>
              </button>
              <button className="flex items-center gap-1 rounded-lg bg-[#da373c] px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#a12d31]">
                <Lock className="size-4" strokeWidth={3} />
                <span>Close With Reason</span>
              </button>
              <button className="flex items-center gap-1 rounded-lg bg-[#3ba55d] px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#2d7d46]">
                <CheckCircle className="size-4" />
                <span>Claim</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
