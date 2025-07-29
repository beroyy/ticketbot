-- Consolidate duplicate guild fields

-- Step 1: Copy data from old fields to new fields where they differ
-- Copy namingScheme to ticketNameFormat where ticketNameFormat is null
UPDATE guilds 
SET ticket_name_format = naming_scheme 
WHERE ticket_name_format IS NULL AND naming_scheme IS NOT NULL;

-- Copy allowUsersToClose to allowUserClose where they differ
UPDATE guilds 
SET allow_user_close = allow_users_to_close 
WHERE allow_users_to_close IS NOT NULL AND allow_user_close != allow_users_to_close;

-- Step 2: Drop the unused/duplicate columns
ALTER TABLE guilds 
  DROP COLUMN IF EXISTS naming_scheme,
  DROP COLUMN IF EXISTS auto_close_time,
  DROP COLUMN IF EXISTS allow_users_to_close,
  DROP COLUMN IF EXISTS thread_tickets,
  DROP COLUMN IF EXISTS auto_thread_archive;