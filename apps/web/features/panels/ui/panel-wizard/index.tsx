import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type {
  PanelFormData,
  FlattenedPanelFormData,
  Question,
  TextSection,
  ValidationErrors,
  PanelFormMode,
  ChannelInfo,
} from "../../types";
import StepNavigation from "./steps/step-navigation";
import PropertiesStep from "./steps/properties-step";
import ContentStep from "./steps/content-step";
import WelcomeStep from "./steps/welcome-step";
import AccessStep from "./steps/access-step";
import DiscordPreview from "@/features/panels/ui/panel-wizard/discord-preview";
import { TicketChannelPreview } from "@/features/panels/ui/panel-wizard/ticket-channel-preview";
import { useDiscordChannels, useDiscordRoles } from "@/features/user/queries";
import { useForms } from "@/features/forms/queries";
import { useTeamRoles } from "@/features/settings/queries";
import { useSelectServer } from "@/features/user/ui/select-server-provider";

const steps = [
  { value: "properties", title: "Properties" },
  { value: "content", title: "Content" },
  { value: "welcome", title: "Welcome" },
  { value: "access", title: "Access" },
];

interface PanelFormProps {
  mode: PanelFormMode;
  formData: PanelFormData;
  questions: Question[];
  textSections: TextSection[];
  validationErrors: ValidationErrors;
  isLoading: boolean;
  currentStep: string;

  // Field change handlers
  onChannelChange: (channel: ChannelInfo | null) => void;
  onSinglePanelFieldChange: <K extends keyof PanelFormData["singlePanel"]>(
    field: K,
    value: PanelFormData["singlePanel"][K]
  ) => void;
  onWelcomeMessageChange: (welcomeMessage: PanelFormData["welcomeMessage"]) => void;
  onAccessControlChange: (allowEveryone: boolean, roles: string[]) => void;

  // Question handlers
  onQuestionAdd: () => void;
  onQuestionUpdate: (id: string, updates: Partial<Question>) => void;
  onQuestionRemove: (id: string) => void;
  onQuestionToggle: (id: string) => void;

  // Text section handlers
  onTextSectionAdd: () => void;
  onTextSectionUpdate: (id: string, updates: Partial<TextSection>) => void;
  onTextSectionRemove: (id: string) => void;

  // Navigation handlers
  onStepChange: (step: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function PanelForm({
  mode,
  formData,
  questions,
  textSections,
  validationErrors,
  isLoading,
  currentStep,
  onChannelChange,
  onSinglePanelFieldChange,
  onWelcomeMessageChange,
  onAccessControlChange,
  onQuestionAdd,
  onQuestionUpdate,
  onQuestionRemove,
  onQuestionToggle,
  onTextSectionAdd,
  onTextSectionUpdate,
  onTextSectionRemove,
  onStepChange,
  onSubmit,
  onCancel: _onCancel,
}: PanelFormProps) {
  // Get current guild
  const { selectedGuildId } = useSelectServer();

  // Fetch Discord data
  const { data: discordChannels, isLoading: channelsLoading } = useDiscordChannels(
    selectedGuildId,
    [0, 4, 5, 15],
    false
  );
  const { data: discordRoles, isLoading: rolesLoading } = useDiscordRoles(selectedGuildId);
  const { data: forms, isLoading: formsLoading } = useForms(selectedGuildId);
  const { data: rolesData, isLoading: teamRolesLoading } = useTeamRoles(selectedGuildId);
  const teamRoles = rolesData || [];

  const getCurrentStepIndex = () => {
    return steps.findIndex((step) => step.value === currentStep);
  };

  const isLastStep = getCurrentStepIndex() === steps.length - 1;

  const handleNextStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      if (nextStep) {
        onStepChange(nextStep.value);
      }
    }
  };

  const handlePreviousStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      const previousStep = steps[currentIndex - 1];
      if (previousStep) {
        onStepChange(previousStep.value);
      }
    }
  };

  // Create flattened formData for backwards compatibility with step components
  const flattenedFormData: FlattenedPanelFormData = {
    channel: formData.channel?.id || "",
    category: formData.singlePanel.title,
    emoji: formData.singlePanel.emoji || "",
    buttonText: formData.singlePanel.buttonText || "",
    color: formData.singlePanel.buttonColor || "",
    welcomeMessage: formData.welcomeMessage?.content || "",
    introTitle: formData.welcomeMessage?.title || "",
    introDescription: formData.welcomeMessage?.content || "",
    mentionOnOpen: formData.singlePanel.mentionOnOpen || "",
    selectTeam: formData.singlePanel.teamId || "",
    hideMentions: formData.singlePanel.hideMentions || false,
    ticketCategory: formData.singlePanel.ticketCategory || "",
    form: formData.singlePanel.form || "",
    namingScheme: formData.singlePanel.namingScheme || false,
    exitSurveyForm: formData.singlePanel.exitSurveyForm || "",
    awaitingResponseCategory: formData.singlePanel.awaitingResponseCategory || "",
    allowEveryone: formData.singlePanel.accessControl?.allowEveryone ?? true,
    allowedRoles: formData.singlePanel.accessControl?.roles.join(",") || "",
    blockedRoles: "",
    largeImageUrl: formData.singlePanel.largeImageUrl || "",
    smallImageUrl: formData.singlePanel.smallImageUrl || "",
  };

  // Convert formData to preview format
  const selectedChannel = discordChannels?.find((ch) => ch.id === formData.channel?.id);
  const selectedRoles = formData.singlePanel.mentionOnOpen
    ? formData.singlePanel.mentionOnOpen.split(",")
    : [];

  return (
    <div className="grid h-[80vh] grid-cols-12">
      {/* Sidebar Navigation */}
      <StepNavigation
        steps={steps}
        currentStep={currentStep}
        onStepChange={onStepChange}
        mode={mode}
      />

      {/* Main Content */}
      <div className="col-span-10 grid h-full grid-cols-10 overflow-scroll bg-white">
        {/* Form Section */}
        <div className="col-span-5 flex h-full flex-col">
          <div className="flex-1 overflow-hidden px-6 py-6">
            {currentStep === "properties" && (
              <PropertiesStep
                formData={flattenedFormData}
                validationErrors={validationErrors}
                onFieldChange={(field, value) => {
                  // Map flattened fields back to nested structure
                  if (field === "channel" && typeof value === "string") {
                    const channel = discordChannels?.find(
                      (ch) => ch.id === value || ch.name === value
                    );
                    onChannelChange(
                      channel ? { id: channel.id || "", displayName: channel.name } : null
                    );
                  } else if (field === "category") {
                    onSinglePanelFieldChange("title", String(value));
                  } else if (field === "emoji" || field === "buttonText") {
                    onSinglePanelFieldChange(field as any, value);
                  } else if (field === "color") {
                    onSinglePanelFieldChange("buttonColor", String(value));
                  } else if (field === "selectTeam") {
                    onSinglePanelFieldChange("teamId", String(value));
                  } else if (field === "allowedRoles") {
                    const roles = typeof value === "string" ? value.split(",").filter(Boolean) : [];
                    onAccessControlChange(
                      formData.singlePanel.accessControl?.allowEveryone ?? true,
                      roles
                    );
                  } else if (
                    field in
                    [
                      "mentionOnOpen",
                      "hideMentions",
                      "ticketCategory",
                      "form",
                      "namingScheme",
                      "exitSurveyForm",
                      "awaitingResponseCategory",
                      "largeImageUrl",
                      "smallImageUrl",
                    ]
                  ) {
                    onSinglePanelFieldChange(field as any, value);
                  }
                }}
                discordRoles={discordRoles}
                rolesLoading={rolesLoading}
                teamRoles={teamRoles}
                teamRolesLoading={teamRolesLoading}
                discordChannels={discordChannels}
                channelsLoading={channelsLoading}
                forms={forms}
                formsLoading={formsLoading}
              />
            )}

            {currentStep === "content" && (
              <ContentStep
                formData={flattenedFormData}
                questions={questions}
                validationErrors={validationErrors}
                onFieldChange={(field, value) => {
                  if (field === "channel" && typeof value === "string") {
                    const channel = discordChannels?.find(
                      (ch) => ch.id === value || ch.name === value
                    );
                    onChannelChange(
                      channel ? { id: channel.id || "", displayName: channel.name } : null
                    );
                  } else if (field === "category") {
                    onSinglePanelFieldChange("title", String(value));
                  } else if (field === "introDescription") {
                    onWelcomeMessageChange({
                      title: formData.welcomeMessage?.title || formData.singlePanel.title,
                      content: String(value),
                      fields: [],
                    });
                  }
                }}
                onQuestionAdd={onQuestionAdd}
                onQuestionUpdate={onQuestionUpdate}
                onQuestionRemove={onQuestionRemove}
                onQuestionToggle={onQuestionToggle}
                discordChannels={discordChannels}
                channelsLoading={channelsLoading}
              />
            )}

            {currentStep === "welcome" && (
              <WelcomeStep
                formData={flattenedFormData}
                textSections={textSections}
                validationErrors={validationErrors}
                onFieldChange={(field, value) => {
                  if (field === "welcomeMessage" || field === "introTitle") {
                    onWelcomeMessageChange({
                      title:
                        field === "introTitle"
                          ? String(value)
                          : formData.welcomeMessage?.title || "",
                      content:
                        field === "welcomeMessage"
                          ? String(value)
                          : formData.welcomeMessage?.content || "",
                      fields: [],
                    });
                  } else if (field === "emoji" || field === "buttonText") {
                    onSinglePanelFieldChange(field as any, value);
                  } else if (field === "color") {
                    onSinglePanelFieldChange("buttonColor", String(value));
                  }
                }}
                onTextSectionAdd={onTextSectionAdd}
                onTextSectionUpdate={onTextSectionUpdate}
                onTextSectionRemove={onTextSectionRemove}
              />
            )}

            {currentStep === "access" && (
              <AccessStep
                formData={flattenedFormData}
                onFieldChange={(field, value) => {
                  if (field === "allowedRoles" || field === "blockedRoles") {
                    const roles = typeof value === "string" ? value.split(",").filter(Boolean) : [];
                    onAccessControlChange(
                      formData.singlePanel.accessControl?.allowEveryone ?? true,
                      field === "allowedRoles"
                        ? roles
                        : formData.singlePanel.accessControl?.roles || []
                    );
                  }
                }}
                discordRoles={discordRoles}
                rolesLoading={rolesLoading}
              />
            )}
          </div>

          {/* Footer with navigation buttons */}
          <div className="mt-auto p-4">
            {currentStep === "access" ? (
              <div className="flex gap-3">
                <Button
                  onClick={handlePreviousStep}
                  variant="outline"
                  className="flex-1 rounded-lg border-gray-200 py-3 text-gray-700 hover:bg-gray-50"
                >
                  <ChevronLeft className="mr-2 size-4" />
                  Back
                </Button>
                <Button
                  onClick={onSubmit}
                  disabled={
                    isLoading || !formData.channel?.id || !formData.singlePanel.title.trim()
                  }
                  className="flex-1 rounded-lg bg-blue-600 py-3 text-white hover:bg-blue-700"
                >
                  {isLoading ? "Saving..." : mode === "create" ? "Create Panel" : "Save Changes"}
                  <ChevronRight className="ml-2 size-4" />
                </Button>
              </div>
            ) : (
              <>
                {isLastStep ? (
                  <Button
                    onClick={onSubmit}
                    disabled={
                      isLoading || !formData.channel?.id || !formData.singlePanel.title.trim()
                    }
                    className="w-full rounded-lg bg-[#1B4F72] py-3 text-white hover:bg-[#154360]"
                  >
                    {isLoading ? "Saving..." : "Save"}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNextStep}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-white hover:bg-blue-700"
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Discord Preview Section */}
        <div className="col-span-5 mr-5 overflow-hidden rounded-3xl bg-gray-50 px-8 py-7">
          <div className="mx-auto flex max-w-2xl flex-col gap-8">
            {/* Panel Preview */}
            <div>
              <h3 className="mb-3 text-xs font-medium tracking-wide text-gray-700">
                PANEL PREVIEW
              </h3>
              <DiscordPreview
                content={formData.welcomeMessage?.content || ""}
                embedColor={formData.singlePanel.buttonColor || "#5865F2"}
                embedTitle={formData.singlePanel.title}
                fields={textSections}
                footerText="Powered by ticketsbot.cloud"
                buttonText={formData.singlePanel.buttonText || "Open ticket"}
                buttonEmoji={formData.singlePanel.emoji || "📧"}
                buttonColor={formData.singlePanel.buttonColor || "#335CFF"}
                channelName={selectedChannel?.name || "general"}
                largeImageUrl={formData.singlePanel.largeImageUrl || ""}
                smallImageUrl={formData.singlePanel.smallImageUrl || ""}
              />
            </div>

            {/* Ticket Channel Preview */}
            <div>
              <h3 className="mb-3 text-xs font-medium tracking-wide text-gray-700">
                TICKET PREVIEW
              </h3>
              <TicketChannelPreview
                welcomeMessage={formData.welcomeMessage?.content || ""}
                embedColor={formData.singlePanel.buttonColor || "#5865F2"}
                ticketNumber={9}
                mentionedRoles={
                  selectedRoles.length > 0
                    ? selectedRoles.map((roleId) => {
                        if (roleId === "ticket-opener") return "@ticket-opener";
                        if (roleId === "here") return "@here";
                        if (roleId === "everyone") return "@everyone";
                        return discordRoles?.find((r) => r.id === roleId)?.name || roleId;
                      })
                    : []
                }
                showMentions={!formData.singlePanel.hideMentions}
                useNamingScheme={formData.singlePanel.namingScheme || false}
                embedTitle={formData.welcomeMessage?.title || formData.singlePanel.title}
                embedTitleUrl=""
                embedDescription={formData.welcomeMessage?.content || ""}
                authorName=""
                authorIconUrl=""
                fields={textSections}
                thumbnailUrl={formData.singlePanel.smallImageUrl || ""}
                imageUrl={formData.singlePanel.largeImageUrl || ""}
                footerText="Powered by ticketsbot.ai"
                footerIconUrl=""
                footerTimestamp=""
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
