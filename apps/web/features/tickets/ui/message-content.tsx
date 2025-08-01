import React from "react";
import Image from "next/image";
import type { Ticket } from "@/features/tickets/types";

interface MessageContentProps {
  content: string;
  ticket: Ticket;
}

export function MessageContent({ content, ticket }: MessageContentProps) {
  if (!content) return null;

  return <>{renderContentWithMentions(content, ticket)}</>;
}

function renderContentWithMentions(content: string, ticket: Ticket): React.ReactNode {
  // First split by user mentions
  const mentionParts = content.split(/(<@\d+>)/g);

  return mentionParts.map((mentionPart, mentionIndex) => {
    // Handle user mentions
    if (mentionPart.match(/^<@\d+>$/)) {
      const openerMetadata = ticket.openerMetadata as { displayName?: string };
      const displayName = openerMetadata.displayName || ticket.opener || "User";
      return (
        <strong key={mentionIndex} className="text-gray-700">
          @{displayName}
        </strong>
      );
    }

    // Split by URLs to handle GIF links
    const urlParts = mentionPart.split(/(https?:\/\/[^\s]+)/g);

    return urlParts.map((urlPart, urlIndex) => {
      // Check if this is a URL
      if (urlPart.match(/^https?:\/\//)) {
        // Check if it's a GIF link (Tenor, Giphy, or direct GIF URLs)
        if (
          urlPart.includes("tenor.com") ||
          urlPart.includes("giphy.com") ||
          urlPart.match(/\.gif(\?|$)/i)
        ) {
          // For Tenor links, use iframe embed
          if (urlPart.includes("tenor.com")) {
            const extractTenorId = (tenorUrl: string): string | null => {
              const match = tenorUrl.match(/gif-(\d+)$/);
              return match ? (match[1] ?? null) : null;
            };

            const tenorId = extractTenorId(urlPart);
            if (tenorId) {
              return (
                <div key={`${String(mentionIndex)}-${String(urlIndex)}`} className="mt-2">
                  <iframe
                    src={`https://tenor.com/embed/${tenorId}`}
                    width="300"
                    height="300"
                    style={{ border: "none" }}
                    allowFullScreen
                    className="rounded"
                  />
                </div>
              );
            }

            // Fallback to link if ID extraction fails
            return (
              <a
                key={`${String(mentionIndex)}-${String(urlIndex)}`}
                href={urlPart}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                🎬 Tenor GIF
              </a>
            );
          }

          // For direct GIF URLs
          if (urlPart.match(/\.gif(\?|$)/i)) {
            return (
              <div key={`${String(mentionIndex)}-${String(urlIndex)}`} className="mt-2">
                <Image
                  src={urlPart}
                  alt="GIF"
                  className="max-w-sm rounded"
                  width={200}
                  height={200}
                />
              </div>
            );
          }
        }

        // Regular link
        return (
          <a
            key={`${String(mentionIndex)}-${String(urlIndex)}`}
            href={urlPart}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            {urlPart}
          </a>
        );
      }

      // Regular text
      return urlPart;
    });
  });
}

export function containsRenderedGif(content: string): boolean {
  return content.includes("tenor.com") || !!content.match(/\.gif(\?|$)/i);
}