-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'CLAIMED', 'CLOSED', 'PENDING');

-- CreateEnum
CREATE TYPE "PanelType" AS ENUM ('SINGLE', 'MULTI');

-- CreateEnum
CREATE TYPE "FormFieldType" AS ENUM ('SHORT_TEXT', 'PARAGRAPH', 'SELECT', 'EMAIL', 'NUMBER', 'CHECKBOX', 'RADIO', 'DATE');

-- CreateEnum
CREATE TYPE "TeamRoleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('TICKET', 'TEAM', 'PANEL', 'MEMBER', 'GUILD');

-- CreateEnum
CREATE TYPE "EventTargetType" AS ENUM ('TICKET', 'ROLE', 'USER', 'PANEL', 'GUILD');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT,
    "discriminator" TEXT,
    "avatar_url" TEXT,
    "discordDataFetchedAt" TIMESTAMP(3),
    "discordUserId" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discord_users" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(32) NOT NULL,
    "discriminator" VARCHAR(5),
    "avatar_url" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discord_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blacklist" (
    "id" SERIAL NOT NULL,
    "guild_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "is_role" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "category" "EventCategory" NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" "EventTargetType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "ticket_id" INTEGER,
    "team_role_id" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forms" (
    "id" SERIAL NOT NULL,
    "guild_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_fields" (
    "id" SERIAL NOT NULL,
    "form_id" INTEGER NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "type" "FormFieldType" NOT NULL,
    "placeholder" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "validation_rules" TEXT,
    "conditional_logic" TEXT,
    "options" TEXT,

    CONSTRAINT "form_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guilds" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "owner_discord_id" TEXT,
    "default_category_id" TEXT,
    "support_category_id" TEXT,
    "max_tickets_per_user" INTEGER NOT NULL DEFAULT 0,
    "auto_close_enabled" BOOLEAN NOT NULL DEFAULT false,
    "auto_close_hours" INTEGER NOT NULL DEFAULT 0,
    "show_claim_button" BOOLEAN NOT NULL DEFAULT true,
    "feedback_enabled" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT DEFAULT 'en',
    "allow_users_to_close" BOOLEAN DEFAULT true,
    "ticket_close_confirmation" BOOLEAN DEFAULT true,
    "anonymous_dashboard" BOOLEAN DEFAULT false,
    "open_commands_enabled" BOOLEAN DEFAULT true,
    "channel_category" TEXT DEFAULT 'Server Stats',
    "naming_scheme" TEXT DEFAULT 'ticket-{number}',
    "welcome_message" TEXT DEFAULT 'Thank you for contacting support.
please describe your issue and await a response.',
    "color_scheme" JSONB,
    "branding" JSONB,
    "footer_text" TEXT,
    "footer_link" TEXT,
    "ticket_name_format" TEXT DEFAULT 'ticket-{number}',
    "allow_user_close" BOOLEAN NOT NULL DEFAULT true,
    "thread_tickets" BOOLEAN NOT NULL DEFAULT false,
    "auto_thread_archive" BOOLEAN NOT NULL DEFAULT false,
    "transcripts_channel" TEXT,
    "log_channel" TEXT,
    "default_ticket_message" TEXT,
    "auto_close_time" INTEGER,
    "total_tickets" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "guilds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_categories" (
    "guildId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "guild_categories_pkey" PRIMARY KEY ("guildId","categoryId")
);

-- CreateTable
CREATE TABLE "guild_support_roles" (
    "guildId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "guild_support_roles_pkey" PRIMARY KEY ("guildId","roleId")
);

-- CreateTable
CREATE TABLE "panels" (
    "id" SERIAL NOT NULL,
    "guild_id" TEXT NOT NULL,
    "type" "PanelType" NOT NULL DEFAULT 'SINGLE',
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT,
    "channel_id" TEXT NOT NULL,
    "category_id" TEXT,
    "form_id" INTEGER,
    "emoji" VARCHAR(64),
    "button_text" VARCHAR(80) NOT NULL DEFAULT 'Create Ticket',
    "color" VARCHAR(7),
    "welcome_message" TEXT,
    "intro_title" VARCHAR(255),
    "intro_description" TEXT,
    "channel_prefix" VARCHAR(50),
    "mention_roles" TEXT,
    "hide_mentions" BOOLEAN NOT NULL DEFAULT false,
    "parent_panel_id" INTEGER,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "permissions" TEXT,
    "message_id" TEXT,
    "deployed_at" TIMESTAMP(3),
    "image_url" TEXT,
    "thumbnail_url" TEXT,
    "text_sections" JSONB,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "panels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "panel_options" (
    "id" SERIAL NOT NULL,
    "panel_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "emoji" VARCHAR(64),
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "category_id" TEXT,
    "form_id" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "panel_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "panel_team_roles" (
    "id" SERIAL NOT NULL,
    "panel_id" INTEGER NOT NULL,
    "team_role_id" INTEGER NOT NULL,

    CONSTRAINT "panel_team_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "guild_id" TEXT NOT NULL,
    "name" VARCHAR(32) NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "guild_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "color" VARCHAR(7),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "discord_id" TEXT NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_roles" (
    "id" SERIAL NOT NULL,
    "guild_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "discord_role_id" TEXT,
    "status" "TeamRoleStatus" NOT NULL DEFAULT 'ACTIVE',
    "color" VARCHAR(7),
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_managed" BOOLEAN NOT NULL DEFAULT true,
    "permissions" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_role_members" (
    "id" SERIAL NOT NULL,
    "discord_id" TEXT NOT NULL,
    "team_role_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by_id" TEXT,

    CONSTRAINT "team_role_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_member_permissions" (
    "id" SERIAL NOT NULL,
    "discord_id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "additional_permissions" BIGINT NOT NULL DEFAULT 0,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_by_id" TEXT,

    CONSTRAINT "team_member_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "bit_value" BIGINT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" SERIAL NOT NULL,
    "guild_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "panel_id" INTEGER,
    "panel_option_id" INTEGER,
    "opener_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "category_id" TEXT,
    "subject" VARCHAR(100),
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "exclude_from_autoclose" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_participants" (
    "ticket_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" VARCHAR(10) NOT NULL,

    CONSTRAINT "ticket_participants_pkey" PRIMARY KEY ("ticket_id","user_id")
);

-- CreateTable
CREATE TABLE "ticket_lifecycle_events" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" VARCHAR(50) NOT NULL,
    "performed_by_id" TEXT NOT NULL,
    "details" JSONB,
    "claimed_by_id" TEXT,
    "closed_by_id" TEXT,
    "close_reason" TEXT,

    CONSTRAINT "ticket_lifecycle_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcripts" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "summary" TEXT,
    "sentiment_score" DOUBLE PRECISION,
    "embedding" TEXT,
    "form_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" SERIAL NOT NULL,
    "transcript_id" INTEGER NOT NULL,
    "message_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT,
    "embeds" TEXT,
    "attachments" TEXT,
    "message_type" VARCHAR(20),
    "reference_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_field_responses" (
    "id" SERIAL NOT NULL,
    "transcript_id" INTEGER NOT NULL,
    "field_id" INTEGER NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ticket_field_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_history" (
    "id" SERIAL NOT NULL,
    "transcript_id" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" VARCHAR(50) NOT NULL,
    "performed_by_id" TEXT NOT NULL,
    "details" TEXT,

    CONSTRAINT "ticket_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_feedback" (
    "id" SERIAL NOT NULL,
    "transcript_id" INTEGER NOT NULL,
    "submitted_by_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_analytics_snapshots" (
    "id" SERIAL NOT NULL,
    "guild_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_open" INTEGER NOT NULL DEFAULT 0,
    "total_closed" INTEGER NOT NULL DEFAULT 0,
    "total_created" INTEGER NOT NULL DEFAULT 0,
    "avg_resolution_time" DOUBLE PRECISION,
    "avg_response_time" DOUBLE PRECISION,
    "by_panel" JSONB,
    "by_staff" JSONB,
    "by_category" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_discordUserId_key" ON "user"("discordUserId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "blacklist_guild_id_is_role_idx" ON "blacklist"("guild_id", "is_role");

-- CreateIndex
CREATE UNIQUE INDEX "blacklist_guild_id_target_id_key" ON "blacklist"("guild_id", "target_id");

-- CreateIndex
CREATE INDEX "events_guild_id_created_at_idx" ON "events"("guild_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "events_actor_id_created_at_idx" ON "events"("actor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "events_ticket_id_created_at_idx" ON "events"("ticket_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "events_team_role_id_created_at_idx" ON "events"("team_role_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "events_target_type_target_id_created_at_idx" ON "events"("target_type", "target_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "events_expires_at_idx" ON "events"("expires_at");

-- CreateIndex
CREATE INDEX "forms_guild_id_idx" ON "forms"("guild_id");

-- CreateIndex
CREATE INDEX "guilds_deleted_at_idx" ON "guilds"("deleted_at");

-- CreateIndex
CREATE INDEX "panels_deleted_at_idx" ON "panels"("deleted_at");

-- CreateIndex
CREATE INDEX "panels_guild_id_enabled_idx" ON "panels"("guild_id", "enabled");

-- CreateIndex
CREATE INDEX "panels_channel_id_idx" ON "panels"("channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "panels_guild_id_message_id_key" ON "panels"("guild_id", "message_id");

-- CreateIndex
CREATE INDEX "panel_team_roles_panel_id_idx" ON "panel_team_roles"("panel_id");

-- CreateIndex
CREATE INDEX "panel_team_roles_team_role_id_idx" ON "panel_team_roles"("team_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "panel_team_roles_panel_id_team_role_id_key" ON "panel_team_roles"("panel_id", "team_role_id");

-- CreateIndex
CREATE INDEX "tags_guild_id_idx" ON "tags"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_guild_id_name_key" ON "tags"("guild_id", "name");

-- CreateIndex
CREATE INDEX "teams_guild_id_idx" ON "teams"("guild_id");

-- CreateIndex
CREATE INDEX "teams_deleted_at_idx" ON "teams"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "teams_guild_id_name_key" ON "teams"("guild_id", "name");

-- CreateIndex
CREATE INDEX "team_members_discord_id_idx" ON "team_members"("discord_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_discord_id_key" ON "team_members"("team_id", "discord_id");

-- CreateIndex
CREATE INDEX "team_roles_guild_id_idx" ON "team_roles"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_roles_guild_id_discord_role_id_key" ON "team_roles"("guild_id", "discord_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_roles_guild_id_name_key" ON "team_roles"("guild_id", "name");

-- CreateIndex
CREATE INDEX "team_role_members_discord_id_idx" ON "team_role_members"("discord_id");

-- CreateIndex
CREATE INDEX "team_role_members_team_role_id_idx" ON "team_role_members"("team_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_role_members_discord_id_team_role_id_key" ON "team_role_members"("discord_id", "team_role_id");

-- CreateIndex
CREATE INDEX "team_member_permissions_discord_id_idx" ON "team_member_permissions"("discord_id");

-- CreateIndex
CREATE INDEX "team_member_permissions_guild_id_idx" ON "team_member_permissions"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_member_permissions_discord_id_guild_id_key" ON "team_member_permissions"("discord_id", "guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "tickets_deleted_at_idx" ON "tickets"("deleted_at");

-- CreateIndex
CREATE INDEX "tickets_guild_id_status_idx" ON "tickets"("guild_id", "status");

-- CreateIndex
CREATE INDEX "tickets_opener_id_status_idx" ON "tickets"("opener_id", "status");

-- CreateIndex
CREATE INDEX "tickets_channel_id_idx" ON "tickets"("channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_guild_id_number_key" ON "tickets"("guild_id", "number");

-- CreateIndex
CREATE INDEX "ticket_lifecycle_events_ticket_id_idx" ON "ticket_lifecycle_events"("ticket_id");

-- CreateIndex
CREATE INDEX "ticket_lifecycle_events_action_idx" ON "ticket_lifecycle_events"("action");

-- CreateIndex
CREATE UNIQUE INDEX "transcripts_ticket_id_key" ON "transcripts"("ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_messages_message_id_key" ON "ticket_messages"("message_id");

-- CreateIndex
CREATE INDEX "ticket_messages_transcript_id_idx" ON "ticket_messages"("transcript_id");

-- CreateIndex
CREATE INDEX "ticket_field_responses_transcript_id_idx" ON "ticket_field_responses"("transcript_id");

-- CreateIndex
CREATE INDEX "ticket_history_transcript_id_idx" ON "ticket_history"("transcript_id");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_feedback_transcript_id_key" ON "ticket_feedback"("transcript_id");

-- CreateIndex
CREATE INDEX "ticket_analytics_snapshots_guild_id_idx" ON "ticket_analytics_snapshots"("guild_id");

-- CreateIndex
CREATE INDEX "ticket_analytics_snapshots_date_idx" ON "ticket_analytics_snapshots"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_analytics_snapshots_guild_id_date_key" ON "ticket_analytics_snapshots"("guild_id", "date");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_discordUserId_fkey" FOREIGN KEY ("discordUserId") REFERENCES "discord_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blacklist" ADD CONSTRAINT "blacklist_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "discord_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_team_role_id_fkey" FOREIGN KEY ("team_role_id") REFERENCES "team_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_categories" ADD CONSTRAINT "guild_categories_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_support_roles" ADD CONSTRAINT "guild_support_roles_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panels" ADD CONSTRAINT "panels_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panels" ADD CONSTRAINT "panels_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panels" ADD CONSTRAINT "panels_parent_panel_id_fkey" FOREIGN KEY ("parent_panel_id") REFERENCES "panels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panel_options" ADD CONSTRAINT "panel_options_panel_id_fkey" FOREIGN KEY ("panel_id") REFERENCES "panels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panel_options" ADD CONSTRAINT "panel_options_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panel_team_roles" ADD CONSTRAINT "panel_team_roles_panel_id_fkey" FOREIGN KEY ("panel_id") REFERENCES "panels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panel_team_roles" ADD CONSTRAINT "panel_team_roles_team_role_id_fkey" FOREIGN KEY ("team_role_id") REFERENCES "team_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_discord_id_fkey" FOREIGN KEY ("discord_id") REFERENCES "discord_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_roles" ADD CONSTRAINT "team_roles_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_role_members" ADD CONSTRAINT "team_role_members_discord_id_fkey" FOREIGN KEY ("discord_id") REFERENCES "discord_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_role_members" ADD CONSTRAINT "team_role_members_team_role_id_fkey" FOREIGN KEY ("team_role_id") REFERENCES "team_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_role_members" ADD CONSTRAINT "team_role_members_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "discord_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member_permissions" ADD CONSTRAINT "team_member_permissions_discord_id_fkey" FOREIGN KEY ("discord_id") REFERENCES "discord_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member_permissions" ADD CONSTRAINT "team_member_permissions_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member_permissions" ADD CONSTRAINT "team_member_permissions_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "discord_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_panel_id_fkey" FOREIGN KEY ("panel_id") REFERENCES "panels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_panel_option_id_fkey" FOREIGN KEY ("panel_option_id") REFERENCES "panel_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_opener_id_fkey" FOREIGN KEY ("opener_id") REFERENCES "discord_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_participants" ADD CONSTRAINT "ticket_participants_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_participants" ADD CONSTRAINT "ticket_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "discord_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_lifecycle_events" ADD CONSTRAINT "ticket_lifecycle_events_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_lifecycle_events" ADD CONSTRAINT "ticket_lifecycle_events_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "discord_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_lifecycle_events" ADD CONSTRAINT "ticket_lifecycle_events_claimed_by_id_fkey" FOREIGN KEY ("claimed_by_id") REFERENCES "discord_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_lifecycle_events" ADD CONSTRAINT "ticket_lifecycle_events_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "discord_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "discord_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_field_responses" ADD CONSTRAINT "ticket_field_responses_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_field_responses" ADD CONSTRAINT "ticket_field_responses_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "form_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "discord_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_feedback" ADD CONSTRAINT "ticket_feedback_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_feedback" ADD CONSTRAINT "ticket_feedback_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "discord_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_analytics_snapshots" ADD CONSTRAINT "ticket_analytics_snapshots_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
