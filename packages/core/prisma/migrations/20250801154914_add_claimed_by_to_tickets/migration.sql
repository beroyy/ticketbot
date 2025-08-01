-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "claimed_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_claimed_by_id_fkey" FOREIGN KEY ("claimed_by_id") REFERENCES "discord_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
