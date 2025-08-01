import { MessageContent } from "./message-content";
import type { Ticket } from "@/features/tickets/types";

interface MessageEmbedProps {
  embeds: Record<string, unknown>[] | null | undefined;
  ticket: Ticket;
  contentHasGif: boolean;
}

export function MessageEmbed({ embeds, ticket, contentHasGif }: MessageEmbedProps) {
  if (!embeds || !Array.isArray(embeds) || embeds.length === 0 || contentHasGif) {
    return null;
  }

  return (
    <div className="mt-2 space-y-2">
      {embeds.map((embed: Record<string, unknown>, index: number) => (
        <div
          key={index}
          className="rounded border-l-4 border-blue-500 bg-gray-50 py-2 pl-3"
        >
          {typeof embed["title"] === "string" && embed["title"] && (
            <div className="text-sm font-bold">{embed["title"]}</div>
          )}
          {typeof embed["description"] === "string" && embed["description"] && (
            <div className="mt-1 text-sm text-gray-600">
              <MessageContent content={embed["description"]} ticket={ticket} />
            </div>
          )}
          {/* Display embed fields (form responses) */}
          {Array.isArray(embed["fields"]) && embed["fields"].length > 0 && (
            <div className="mt-3 space-y-2">
              {(embed["fields"] as Record<string, unknown>[]).map(
                (field: Record<string, unknown>, fieldIndex: number) => (
                  <div key={fieldIndex} className="border-t border-gray-200 pt-2">
                    <div className="mb-1 text-xs font-medium text-gray-700">
                      {field["name"] as string}
                    </div>
                    <div className="rounded border-l-2 border-gray-300 bg-white p-2 text-sm text-gray-800">
                      {(field["value"] as string).replace(/^>>> /, "")}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}