"use client";

import Image from "next/image";
import { Check, Hash, AlignCenter, Bell, Pin, Users } from "lucide-react";

interface DiscordPreviewProps {
  content?: string;
  embedColor?: string;
  embedTitle?: string;
  fields?: Array<{ name: string; value: string }>;
  footerText?: string;
  buttonText?: string;
  buttonEmoji?: string;
  buttonColor?: string;
  channelName?: string;
  largeImageUrl?: string;
  smallImageUrl?: string;
}

export default function DiscordPreview({
  content = "Your content goes here",
  embedColor = "#5865F2",
  embedTitle,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fields = [],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  footerText = "Powered by ticketsbot.cloud",
  buttonText = "Open a ticket!",
  buttonEmoji = "🎫",
  buttonColor = "#5865F2",
  channelName = "general",
  largeImageUrl,
  smallImageUrl,
}: DiscordPreviewProps) {
  return (
    <div className="h-fit w-full overflow-hidden rounded-2xl bg-[#36393f]">
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

      <div className="w-full max-w-lg p-6">
        {/* Message */}
        <div className="flex gap-4">
          {/* Avatar */}
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
            {/* Bot Name */}
            <div className="mb-1 flex items-center gap-1.5">
              <span className="font-medium text-white">ticketsbot.ai</span>
              <div className="flex items-center gap-0.5 rounded bg-[#5865F2] px-1.5 py-0.5">
                <Check className="size-3 text-white" />
                <span className="text-xs font-medium text-white">APP</span>
              </div>
            </div>

            {/* Embed */}
            <div
              className="relative max-w-md overflow-hidden rounded-md bg-[#2f3136]"
              style={{ borderLeft: `4px solid ${embedColor}` }}
            >
              <div className="flex">
                <div className="flex-1 p-4 pb-0">
                  {/* Title */}
                  <div className="mb-2 font-semibold text-white">
                    {embedTitle || "Your Panel Title"}
                  </div>

                  {/* Content */}
                  <div className="text-sm text-[#dcddde]">
                    {content || "Your content goes here"}
                  </div>
                </div>

                {/* Small Image (Thumbnail) */}
                {smallImageUrl && (
                  <div className="flex-shrink-0 p-4 pb-0">
                    <Image
                      src={smallImageUrl}
                      alt="Thumbnail"
                      width={80}
                      height={80}
                      className="rounded object-cover"
                      unoptimized
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Large Image */}
              {largeImageUrl && (
                <div className="px-4 pb-0 pt-3">
                  <Image
                    src={largeImageUrl}
                    alt="Embed image"
                    width={416}
                    height={300}
                    className="h-auto w-full rounded object-contain"
                    unoptimized
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                    }}
                  />
                </div>
              )}

              {/* Footer with logo - Always at the bottom */}
              <div className="p-4">
                <div className="flex items-center gap-2 text-xs text-[#72767d]">
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

            {/* Button */}
            <div className="mt-2">
              <button
                className="inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-90"
                style={{ backgroundColor: buttonColor }}
              >
                <span>{buttonEmoji}</span>
                <span>{buttonText}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
