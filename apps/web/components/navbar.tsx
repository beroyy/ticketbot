import Link from "next/link";
import { useRouter } from "next/router";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MdOutlineArrowDropDown } from "react-icons/md";
import { useAuth } from "@/features/auth/auth-provider";
import { usePermissions, PermissionFlags } from "@/features/permissions/hooks/use-permissions";
import { ServerSelectDropdown } from "@/features/user/ui/server-select-dropdown";

interface NavItem {
  href: string;
  label: string;
  permission?: bigint;
  permissions?: bigint[]; // For checking multiple permissions (OR condition)
  requiresGuild?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", label: "Home" },
  {
    href: "/tickets",
    label: "Tickets",
    permission: PermissionFlags.TICKET_VIEW_ALL,
    requiresGuild: true,
  },
];

export function Navbar() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isClient, setIsClient] = useState(false);
  const { selectedGuildId } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermissions();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Filter nav items based on permissions
  const visibleNavItems = useMemo(() => {
    return navItems.filter((item) => {
      // Always show items that don't require permissions
      if (!item.permission && !item.permissions) return true;

      // If item requires a guild but none is selected, hide it
      if (item.requiresGuild && !selectedGuildId) return false;

      // Check single permission
      if (item.permission) {
        return hasPermission(item.permission);
      }

      // Check multiple permissions (OR condition - user needs at least one)
      if (item.permissions) {
        return hasAnyPermission(...item.permissions);
      }

      return true;
    });
  }, [selectedGuildId, hasPermission, hasAnyPermission]);

  // Hide navbar on auth/setup pages
  if (["/setup", "/login", "/guilds"].includes(router.pathname)) return null;

  return (
    <nav className="z-10 bg-[#06234A] px-9 py-3.5 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Image src="/logo.svg" alt="Logo" width={200} height={64} className="aspect-auto" />

          <div className="flex space-x-6">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  router.pathname === item.href
                    ? "bg-primary-focused text-white"
                    : "text-muted-text hover:bg-white/10 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            ))}
            {session?.user && visibleNavItems.length <= 1 && (
              <span className="text-muted-text px-3 py-2 text-sm">
                {!selectedGuildId
                  ? "Select a server to access features"
                  : "Limited access - contact server admin"}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!isClient || isPending ? (
            <div className="text-sm">Loading...</div>
          ) : session?.user ? (
            <>
              {selectedGuildId && <ServerSelectDropdown />}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="bg-primary-focused ring-ring-primary flex items-center rounded-full p-1.5 pr-3 ring-1 transition-colors hover:bg-white/20">
                    <div className="mb-[1px] size-7 overflow-hidden rounded-full">
                      {session.user.image ? (
                        <Image
                          src={session.user.image}
                          alt={session.user.name || "User"}
                          className="size-full object-cover"
                          width={28}
                          height={28}
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center bg-orange-500">
                          <span className="text-xs font-medium text-white">
                            {((session.user.name || "U")[0] || "U").toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="ml-2 mr-1 text-sm tracking-wide text-white">
                      {session.user.name}
                    </span>
                    <MdOutlineArrowDropDown className="mt-[1px] size-5 text-[#CFCFCF]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => {
                      authClient.signOut();
                    }}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <button
              onClick={() => {
                authClient.signIn.social({
                  provider: "discord",
                  callbackURL: typeof window !== "undefined" ? window.location.origin : undefined,
                });
              }}
              className="rounded bg-white/20 px-3 py-1 text-sm transition-colors hover:bg-white/30"
            >
              Sign in with Discord
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
