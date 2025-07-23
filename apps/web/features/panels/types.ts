export interface Question {
  id: string;
  type: "short_answer" | "paragraph";
  label: string;
  placeholder: string;
  enabled: boolean;
  characterLimit?: number;
}

export interface TextSection {
  id: string;
  name: string;
  value: string;
}

export interface ChannelInfo {
  id: string;
  displayName: string;
}

export interface PanelFormData {
  // Top level fields
  type: "SINGLE" | "MULTI";
  guildId: string;
  channel: ChannelInfo | null;

  // Welcome message
  welcomeMessage?: {
    title: string;
    content?: string;
    fields?: Array<{ name: string; value: string }>;
  };

  // Single panel data - matches API structure
  singlePanel: {
    title: string;
    emoji?: string;
    buttonText?: string;
    buttonColor?: string;
    categoryId?: string;
    teamId?: string;
    mentionOnOpen?: string;
    hideMentions?: boolean;
    ticketCategory?: string;
    form?: string;
    namingScheme?: boolean;
    exitSurveyForm?: string;
    awaitingResponseCategory?: string;
    accessControl?: {
      allowEveryone: boolean;
      roles: string[];
    };
    largeImageUrl?: string;
    smallImageUrl?: string;
  };
}

export interface PanelFormState {
  formData: PanelFormData;
  questions: Question[];
  textSections: TextSection[];
}

export interface ValidationErrors {
  [key: string]: string;
}

export type PanelFormMode = "create" | "edit";

// CreatePanelDto now directly extends PanelFormData with additions
export interface CreatePanelDto extends Omit<PanelFormData, "channel"> {
  channelId: string;
  singlePanel: PanelFormData["singlePanel"] & {
    questions: Question[];
    textSections?: Array<{ name: string; value: string }>;
  };
}

// Legacy flattened structure for step components
export interface FlattenedPanelFormData {
  channel: string;
  category: string;
  emoji: string;
  buttonText: string;
  color: string;
  welcomeMessage: string;
  introTitle: string;
  introDescription: string;
  mentionOnOpen: string;
  selectTeam: string;
  hideMentions: boolean;
  ticketCategory: string;
  form: string;
  namingScheme: boolean;
  exitSurveyForm: string;
  awaitingResponseCategory: string;
  allowEveryone: boolean;
  allowedRoles: string;
  blockedRoles: string;
  largeImageUrl: string;
  smallImageUrl: string;
}

export interface UpdatePanelDto {
  channel: string;
  title: string;
  category: string;
  questions: Question[];
  mentionOnOpen?: string | undefined;
  selectTeam?: string | undefined;
  hideMentions?: boolean | undefined;
  ticketCategory?: string | undefined;
  form?: string | undefined;
  namingScheme?: boolean | undefined;
  exitSurveyForm?: string | undefined;
  awaitingResponseCategory?: string | undefined;
  emoji?: string | undefined;
  buttonText?: string | undefined;
  color?: string | undefined;
  welcomeMessage?: string | undefined;
  introTitle?: string | undefined;
  introDescription?: string | undefined;
  guildId?: string | undefined;
}
