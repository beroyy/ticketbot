import { apiClient } from "@/lib/api";
import type { CreatePanelDto, UpdatePanelDto } from "./types";

// Panel types
export interface FormField {
  id: number;
  formId: number;
  type: "SHORT_ANSWER" | "PARAGRAPH" | "MULTIPLE_CHOICE" | "CHECKBOXES" | "DROPDOWN";
  label: string;
  placeholder?: string;
  required: boolean;
  orderIndex: number;
  validationRules?: string; // JSON
  options?: string; // JSON for multiple choice/dropdown
}

export interface Form {
  id: number;
  title: string;
  description?: string;
  guildId: string;
  fields: FormField[];
}

export interface Panel {
  id: string;
  guildId: string;
  type: "SINGLE" | "MULTI";
  title: string;
  content?: string;
  channelId: string;
  categoryId?: string;
  formId?: number;
  emoji?: string;
  buttonText: string;
  color?: string;
  welcomeMessage?: string;
  introTitle?: string;
  introDescription?: string;
  channelPrefix?: string;
  mentionRoles?: string; // JSON array
  supportTeamRoles?: string; // JSON array
  parentPanelId?: number;
  orderIndex: number;
  enabled: boolean;
  permissions?: string; // JSON
  messageId?: string;
  deployedAt?: string;
  form?: Form;
  // Legacy fields for backwards compatibility
  channel: string;
}

// API functions
async function fetchPanels(guildId: string | null): Promise<Panel[]> {
  if (!guildId) throw new Error("Guild ID is required");
  return apiClient.get<Panel[]>(`/panels?guildId=${guildId}`);
}

async function fetchPanel(panelId: string): Promise<Panel> {
  return apiClient.get<Panel>(`/panels/${panelId}`);
}

async function createPanel(data: CreatePanelDto): Promise<Panel> {
  return apiClient.post<Panel>("/panels", data);
}

async function updatePanel(panelId: string, data: UpdatePanelDto): Promise<Panel> {
  return apiClient.post<Panel>(`/panels/${panelId}`, data);
}

async function deletePanel(panelId: string): Promise<void> {
  return apiClient.request(`/panels/${panelId}`, {
    method: "DELETE",
  });
}

async function deployPanel(panelId: string): Promise<Panel> {
  return apiClient.post<Panel>(`/panels/${panelId}/deploy`);
}

// Query factory
export const panelQueries = {
  list: (guildId: string | null) => ({
    queryKey: ["panels", "list", guildId],
    queryFn: () => fetchPanels(guildId),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!guildId,
  }),

  detail: (panelId: string) => ({
    queryKey: ["panels", "detail", panelId],
    queryFn: () => fetchPanel(panelId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!panelId,
  }),
};

// Mutation functions exported for use in mutation hooks
export const panelMutations = {
  create: createPanel,
  update: updatePanel,
  delete: deletePanel,
  deploy: deployPanel,
};
