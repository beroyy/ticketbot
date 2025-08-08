import { z } from "zod";

export const PreferenceKeySchema = z
  .string()
  .min(1)
  .max(50)
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Preference key must contain only alphanumeric characters, underscores, and hyphens"
  );

export const SetPreferenceSchema = z.object({
  key: PreferenceKeySchema,
  value: z.any(),
});

export const _PreferenceResponse = z.object({
  value: z.any().nullable(),
});

export const getPreferenceKey = (discordId: string, key: string) =>
  `preferences:user:${discordId}:${key}`;
