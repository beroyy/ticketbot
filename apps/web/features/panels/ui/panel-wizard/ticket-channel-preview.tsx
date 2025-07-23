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

interface Field {
  name: string;
  value: string;
}

interface TicketChannelPreviewProps {
  welcomeMessage?: string;
  embedColor?: string;
  ticketNumber?: number;
  mentionedRoles?: string[];
  showMentions?: boolean;
  useNamingScheme?: boolean;
  ticketPrefix?: string;
  embedTitle?: string;
  embedTitleUrl?: string;
  embedDescription?: string;
  authorName?: string;
  authorIconUrl?: string;
  fields?: Field[];
  thumbnailUrl?: string;
  imageUrl?: string;
  footerText?: string;
  footerIconUrl?: string;
  footerTimestamp?: string;
}

export default function TicketChannelPreview({
  welcomeMessage = "Thank you for contacting support.\nPlease describe your issue and wait for a response.",
  embedColor = "#5865F2",
  ticketNumber = 9,
  mentionedRoles = ["Ticketsbot", "Tickets Support", "Tickets Admin"],
  showMentions = true,
  useNamingScheme = true,
  ticketPrefix = "ticket",
  embedTitle,
  embedTitleUrl,
  embedDescription,
  authorName,
  authorIconUrl,
  fields = [],
  thumbnailUrl,
  imageUrl,
  footerText = "Powered by ticketsbot.ai",
  footerIconUrl,
  footerTimestamp,
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
              className="size-full object-cover"
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
              <div className="relative flex">
                <div className="flex-1 p-4">
                  {/* Author */}
                  {(authorName || authorIconUrl) && (
                    <div className="mb-2 flex items-center gap-2">
                      {authorIconUrl && (
                        <img
                          src={authorIconUrl}
                          alt="Author"
                          className="size-6 rounded-full object-cover"
                        />
                      )}
                      {authorName && (
                        <span className="text-sm font-medium text-white">{authorName}</span>
                      )}
                    </div>
                  )}

                  {/* Title */}
                  {embedTitle && (
                    <div className="mb-2">
                      {embedTitleUrl ? (
                        <a
                          href={embedTitleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-[#00b0f4] hover:underline"
                        >
                          {embedTitle}
                        </a>
                      ) : (
                        <span className="text-sm font-semibold text-white">{embedTitle}</span>
                      )}
                    </div>
                  )}

                  {/* Description/Message */}
                  {(embedDescription || welcomeMessage) && (
                    <div className="mb-3 whitespace-pre-wrap text-sm text-[#dcddde]">
                      {embedDescription || welcomeMessage}
                    </div>
                  )}

                  {/* Fields */}
                  {fields.length > 0 && (
                    <div className="mb-3 grid grid-cols-1 gap-2">
                      {fields.map((field, index) => (
                        <div key={index}>
                          <div className="text-xs font-semibold text-[#dcddde]">{field.name}</div>
                          <div className="text-xs text-[#a3a6aa]">{field.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Image */}
                  {imageUrl && (
                    <div className="mb-3 overflow-hidden rounded">
                      <img
                        src={imageUrl}
                        alt="Embed image"
                        className="h-auto w-full object-cover"
                      />
                    </div>
                  )}

                  {/* Footer */}
                  {(footerText || footerIconUrl || footerTimestamp) && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-[#72767d]">
                      {footerIconUrl && (
                        <img src={footerIconUrl} alt="Footer" className="size-4 rounded-full" />
                      )}
                      {footerText && <span>{footerText}</span>}
                      {footerText && footerTimestamp && <span>•</span>}
                      {footerTimestamp && <span>{footerTimestamp}</span>}
                    </div>
                  )}
                </div>

                {/* Thumbnail */}
                {thumbnailUrl && (
                  <div className="flex-shrink-0 p-4">
                    <img
                      src={thumbnailUrl}
                      alt="Thumbnail"
                      className="size-20 rounded object-cover"
                    />
                  </div>
                )}
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

export { TicketChannelPreview };
