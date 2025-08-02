import { useAuth } from "@/features/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/router";

/**
 * Test page to verify the new auth system
 * This page requires guild selection (it's a protected route)
 */
export default function TestAuthPage() {
  const router = useRouter();
  const { isAuthenticated, hasGuildSelected, selectedGuildId, authState, setSelectedGuildId } =
    useAuth();

  const handleLogout = async () => {
    // Clear guild selection before signing out
    setSelectedGuildId(null);
    await authClient.signOut();
    router.push("/login");
  };

  const handleClearGuild = () => {
    setSelectedGuildId(null);
  };

  return (
    <div className="container mx-auto max-w-2xl p-8">
      <Card>
        <CardHeader>
          <CardTitle>Auth System Test Page</CardTitle>
          <CardDescription>This page tests the new simplified auth provider</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Current Auth State</h3>
            <div className="space-y-1 rounded-lg bg-gray-50 p-4 font-mono text-sm">
              <div>
                Auth State: <span className="font-bold">{authState}</span>
              </div>
              <div>
                Is Authenticated:{" "}
                <span className={isAuthenticated ? "text-green-600" : "text-red-600"}>
                  {String(isAuthenticated)}
                </span>
              </div>
              <div>
                Has Guild Selected:{" "}
                <span className={hasGuildSelected ? "text-green-600" : "text-red-600"}>
                  {String(hasGuildSelected)}
                </span>
              </div>
              <div>
                Selected Guild ID:{" "}
                <span className="text-blue-600">{selectedGuildId || "none"}</span>
              </div>
              <div>
                Current Route: <span className="text-purple-600">{router.pathname}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Navigation Test</h3>
            <p className="text-sm text-gray-600">
              Since this is a protected route, you should only see this if you're authenticated with
              a guild selected.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Actions</h3>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => router.push("/")}>Go to Home</Button>
              <Button onClick={() => router.push("/setup")} variant="outline">
                Go to Setup
              </Button>
              <Button onClick={() => router.push("/tickets")} variant="outline">
                Go to Tickets
              </Button>
              <Button onClick={handleClearGuild} variant="destructive">
                Clear Guild Selection
              </Button>
              <Button onClick={handleLogout} variant="destructive">
                Logout
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-4">
            <h4 className="mb-1 font-semibold text-blue-900">How it works:</h4>
            <ul className="list-inside list-disc space-y-1 text-sm text-blue-700">
              <li>This page is in the "requiresGuild" route list</li>
              <li>If you're not authenticated, you'll be redirected to /login</li>
              <li>If you're authenticated but have no guild, you'll be redirected to /setup</li>
              <li>Try clearing guild selection or logging out to test redirects</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
