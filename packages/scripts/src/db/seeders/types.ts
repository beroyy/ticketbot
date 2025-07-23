export interface SeedConfig {
  environment: "small" | "medium" | "large";
  clearExistingData: boolean;
  enableProgressLogging: boolean;
  batchSize: number;
}

export const DEFAULT_CONFIG: SeedConfig = {
  environment: "medium",
  clearExistingData: true,
  enableProgressLogging: true,
  batchSize: 50,
};

// Data volume configurations
export const DATA_VOLUMES = {
  small: {
    users: 3,
    panels: 2,
    tickets: 10,
    messagesPerTicket: [2, 5] as [number, number],
    tags: 3,
    blacklistEntries: 2,
  },
  medium: {
    users: 5,
    panels: 3,
    tickets: 500,
    messagesPerTicket: [3, 8] as [number, number],
    tags: 5,
    blacklistEntries: 5,
  },
  large: {
    users: 10,
    panels: 5,
    tickets: 1000,
    messagesPerTicket: [5, 12] as [number, number],
    tags: 8,
    blacklistEntries: 10,
  },
};

// Type definitions for seeders
export interface UserWithRole {
  id: string;
  username: string;
  role: "customer" | "support" | "admin";
}

export interface SeederDependencies {
  guildId: string;
  users: UserWithRole[];
  panelIds: number[];
  teamRoleIds: number[];
  formIds?: number[];
}
