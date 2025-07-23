import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession, signIn } from "@ticketsbot/core/auth/client";
import { useState, useEffect } from "react";
import GeneralSettings from "@/features/settings/ui/general-settings";
import TeamRoles from "@/features/settings/ui/team-roles";
import Tickets from "@/features/settings/ui/tickets";
import OpenCommands from "@/features/settings/ui/open-commands";
import ContextMenu from "@/features/settings/ui/context-menu";
import AutoClose from "@/features/settings/ui/auto-close";
import { PermissionGuard } from "@/components/permission-guard";
import { PermissionFlags } from "@/features/permissions/hooks/use-permissions";

export default function SettingsPage() {
  const { data: session, isPending } = useSession();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Loading state
  if (!isClient || isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-[#103A71]"></div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  // Unauthenticated state
  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <div className="mb-6">
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Authentication Required</h1>
            <p className="text-gray-600">
              Please sign in with Discord to access the settings panel.
            </p>
          </div>
          <button
            onClick={() => {
              void signIn.social({
                provider: "discord",
                callbackURL: typeof window !== "undefined" ? window.location.href : undefined,
              });
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0002 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z" />
            </svg>
            Sign in with Discord
          </button>
        </div>
      </div>
    );
  }

  // Authenticated content
  return (
    <PermissionGuard permission={PermissionFlags.GUILD_SETTINGS_VIEW}>
      <div className="min-h-screen bg-white">
        <div className="mx-5 max-w-7xl px-4 py-8">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="flex h-auto w-full justify-start rounded-none border-b border-gray-200 bg-white p-0">
              <TabsTrigger
                value="general"
                className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-3 text-gray-600 hover:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-[#103A71] data-[state=active]:bg-transparent data-[state=active]:text-[#0E121B]"
              >
                General Settings
              </TabsTrigger>
              <TabsTrigger
                value="team-roles"
                className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-3 text-gray-600 hover:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-[#103A71] data-[state=active]:bg-transparent data-[state=active]:text-[#0E121B]"
              >
                Team Roles
              </TabsTrigger>
              <TabsTrigger
                value="tickets"
                className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-3 text-gray-600 hover:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-[#103A71] data-[state=active]:bg-transparent data-[state=active]:text-[#0E121B]"
              >
                Tickets
              </TabsTrigger>
              <TabsTrigger
                value="open-commands"
                className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-3 text-gray-600 hover:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-[#103A71] data-[state=active]:bg-transparent data-[state=active]:text-[#0E121B]"
              >
                Open Commands
              </TabsTrigger>
              <TabsTrigger
                value="context-menu"
                className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-3 text-gray-600 hover:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-[#103A71] data-[state=active]:bg-transparent data-[state=active]:text-[#0E121B]"
              >
                Context Menu
              </TabsTrigger>
              <TabsTrigger
                value="auto-close"
                className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-3 text-gray-600 hover:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-[#103A71] data-[state=active]:bg-transparent data-[state=active]:text-[#0E121B]"
              >
                Auto Close
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <GeneralSettings />
            </TabsContent>

            <TabsContent value="team-roles">
              <TeamRoles />
            </TabsContent>

            <TabsContent value="tickets">
              <Tickets />
            </TabsContent>

            <TabsContent value="open-commands">
              <OpenCommands />
            </TabsContent>

            <TabsContent value="context-menu">
              <ContextMenu />
            </TabsContent>

            <TabsContent value="auto-close">
              <AutoClose />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PermissionGuard>
  );
}
