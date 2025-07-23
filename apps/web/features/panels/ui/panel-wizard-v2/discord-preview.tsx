import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PanelFormData } from "../../schemas/panel-form-schema";

interface DiscordPreviewProps {
  data: Partial<PanelFormData>;
}

export function DiscordPreview({ data }: DiscordPreviewProps) {
  const {
    title = "Panel Title",
    buttonText = "Create Ticket",
    buttonColor = "#5865F2",
    emoji,
    textSections = [],
    largeImageUrl,
    smallImageUrl,
  } = data;

  return (
    <div className="space-y-4">
      {/* Discord Message Preview */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="bg-[#36393f] p-4">
          <div className="flex items-start gap-3">
            {/* Bot Avatar */}
            <div className="h-10 w-10 rounded-full bg-[#5865F2]" />

            {/* Message Content */}
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="font-semibold text-white">TicketsBot</span>
                <Badge variant="secondary" className="bg-[#5865F2] text-xs text-white">
                  BOT
                </Badge>
                <span className="text-xs text-gray-400">Today at 12:00 PM</span>
              </div>

              {/* Embed */}
              <div className="overflow-hidden rounded border-l-4 border-[#5865F2] bg-[#2f3136]">
                <CardHeader className="pb-2">
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                </CardHeader>

                <CardContent className="space-y-3 text-sm text-gray-300">
                  {textSections.map((section, index) => (
                    <div key={section.id || index}>
                      <div className="font-semibold text-white">{section.name}</div>
                      <div>{section.value}</div>
                    </div>
                  ))}

                  {largeImageUrl && (
                    <div className="mt-3 aspect-video w-full overflow-hidden rounded bg-gray-700">
                      <img
                        src={largeImageUrl}
                        alt="Panel image"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </CardContent>

                {smallImageUrl && (
                  <div className="absolute right-4 top-4 h-20 w-20 overflow-hidden rounded">
                    <img
                      src={smallImageUrl}
                      alt="Thumbnail"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Action Row */}
              <div className="mt-3">
                <Button className="text-white" style={{ backgroundColor: buttonColor }}>
                  {emoji && <span className="mr-2">{emoji}</span>}
                  {buttonText}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Ticket Channel Preview */}
      {data.welcomeMessage && (
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-[#36393f] p-4">
            <h4 className="mb-2 text-sm font-semibold text-gray-400">TICKET CHANNEL PREVIEW</h4>
            <div className="rounded bg-[#40444b] p-3">
              <div className="mb-2 text-white"># ticket-0001</div>
              {data.welcomeMessage.title && (
                <div className="mb-1 font-semibold text-white">{data.welcomeMessage.title}</div>
              )}
              {data.welcomeMessage.content && (
                <div className="text-sm text-gray-300">{data.welcomeMessage.content}</div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
