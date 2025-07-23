import React, { useEffect } from "react";
import { PanelWizardV2 } from "./panel-wizard-v2";
import { useSelectServer } from "@/features/user/ui/select-server-provider";
import { useCreatePanelMutation, useUpdatePanelMutation } from "@/hooks/use-panel-query";
import { useFormDraft, useFormActions } from "@/shared/stores/app-store";
import { notify } from "@/shared/stores/app-store";
import type { PanelFormData } from "../schemas/panel-form-schema";
import type { CreatePanelDto, UpdatePanelDto } from "../types";
import type { Panel } from "../queries";

interface PanelContainerProps {
  mode: "create" | "edit";
  panel?: Panel;
  onBack: () => void;
}

export default function PanelContainer({ mode, panel, onBack }: PanelContainerProps) {
  const { selectedGuildId } = useSelectServer();
  const { updateDraft } = useFormActions();

  // Get stored draft for this guild
  const draft = useFormDraft(`panel-${selectedGuildId}`);

  // Mutations
  const createPanel = useCreatePanelMutation();
  const updatePanel = useUpdatePanelMutation();

  const handleSubmit = async (data: PanelFormData) => {
    if (!selectedGuildId) {
      notify.error("No guild selected");
      return;
    }

    try {
      if (mode === "create") {
        // Transform for create API
        const createData: CreatePanelDto = {
          type: "SINGLE",
          guildId: selectedGuildId,
          channelId: data.channelId,
          welcomeMessage: data.welcomeMessage?.content
            ? {
                title: data.welcomeMessage?.title || data.title,
                content: data.welcomeMessage?.content,
              }
            : undefined,
          singlePanel: {
            title: data.title,
            buttonText: data.buttonText,
            emoji: data.emoji || undefined,
            categoryId: data.categoryId || undefined,
            buttonColor: data.buttonColor || undefined,
            questions: data.questions
              .filter((q) => q.enabled)
              .map((q) => ({
                ...q,
                placeholder: q.placeholder || "",
              })),
          },
        };
        await createPanel.mutateAsync(createData);
      } else if (mode === "edit" && panel) {
        // Transform for update API
        const updateData: UpdatePanelDto = {
          channel: data.channelId,
          title: data.title,
          category: data.title,
          questions: data.questions
            .filter((q) => q.enabled)
            .map((q) => ({
              ...q,
              placeholder: q.placeholder || "",
            })),
          emoji: data.emoji || undefined,
          buttonText: data.buttonText,
          color: data.buttonColor || undefined,
          welcomeMessage: data.welcomeMessage?.content,
          introTitle: data.welcomeMessage?.title,
          guildId: selectedGuildId,
        };
        await updatePanel.mutateAsync({
          panelId: panel.id,
          data: updateData,
        });
      }
    } catch (error) {
      console.error("Failed to save panel:", error);
      throw error;
    }
  };

  const handleDraftSave = (data: PanelFormData) => {
    updateDraft(`panel-${selectedGuildId}`, data);
    notify.success("Draft saved", "Your changes have been saved as a draft");
  };

  // Load draft on mount for create mode
  useEffect(() => {
    if (mode === "create" && selectedGuildId && draft) {
      notify.info("Draft loaded", "Your previous draft has been restored");
    }
  }, [mode, selectedGuildId, draft]);

  // Convert panel to initial values if editing
  const initialValues = panel
    ? {
        // Required fields from CreatePanelSchema
        type: panel.type,
        title: panel.title || "",
        guildId: panel.guildId,
        channelId: panel.channelId || "",
        orderIndex: panel.orderIndex ?? 0,
        enabled: panel.enabled ?? true,
        
        // UI-specific fields
        buttonText: panel.buttonText || "Create Ticket",
        buttonColor: panel.color ?? "#5865F2",
        emoji: panel.emoji ?? "",
        categoryId: panel.categoryId ?? "",
        
        // Complex fields
        questions: [
          {
            id: "1",
            type: "short_answer" as const,
            label: "What is your issue?",
            placeholder: "",
            enabled: true,
          },
        ],
        textSections: [],
        welcomeMessage: {
          title: panel.introTitle ?? "",
          content: panel.welcomeMessage ?? "",
          fields: [],
        },
        accessControl: {
          allowEveryone: true,
          roles: [],
        },
        
        // Optional fields
        mentionOnOpen: "",
        hideMentions: false,
        namingScheme: false,
        largeImageUrl: "",
        smallImageUrl: "",
        teamId: undefined,
        ticketCategory: undefined,
        exitSurveyForm: undefined,
        awaitingResponseCategory: undefined,
      }
    : undefined;

  return (
    <PanelWizardV2
      mode={mode}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      onCancel={onBack}
      onDraftSave={handleDraftSave}
      isSubmitting={createPanel.isPending || updatePanel.isPending}
    />
  );
}
