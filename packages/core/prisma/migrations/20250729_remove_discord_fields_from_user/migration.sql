-- Remove Discord-specific fields from User model
-- These fields are now exclusively stored in DiscordUser model

ALTER TABLE "user" 
  DROP COLUMN IF EXISTS username,
  DROP COLUMN IF EXISTS discriminator,
  DROP COLUMN IF EXISTS avatar_url,
  DROP COLUMN IF EXISTS discord_data_fetched_at;