import Link from "next/link";
import { useRouter } from "next/router";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import { useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MdOutlineArrowDropDown } from "react-icons/md";
import { useAuth } from "@/features/auth";
import { usePermissions } from "@/features/permissions/hooks/use-permissions";
import { PermissionFlags } from "@ticketsbot/auth/client";
import { ServerSelectDropdown } from "@/features/user/ui/server-select-dropdown";
import { Skeleton } from "@/components/ui/skeleton";
import { StableAvatar } from "@/components/stable-avatar";
import { LogOut } from "lucide-react";
import { env } from "@/env";

type NavItem = {
  href: string;
  label: string;
  permission?: bigint;
  permissions?: bigint[];
  requiresGuild?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  {
    href: "/tickets",
    label: "Tickets",
    permission: PermissionFlags.TICKET_VIEW_ALL,
    requiresGuild: true,
  },
];

export function Navbar() {
  const router = useRouter();
  const { session: authSession, selectedGuildId, setSelectedGuildId } = useAuth();
  const { data: clientSession, isPending } = authClient.useSession();
  // Use authSession from context (has initial SSR data) as fallback to avoid skeleton
  const session = clientSession || authSession;
  const { hasPermission, hasAnyPermission } = usePermissions();

  const visibleNavItems = useMemo(() => {
    return navItems.filter((item) => {
      if (!item.permission && !item.permissions) return true;

      if (item.requiresGuild && !selectedGuildId) return false;

      if (item.permission) {
        return hasPermission(item.permission);
      }

      if (item.permissions) {
        return hasAnyPermission(...item.permissions);
      }

      return true;
    });
  }, [selectedGuildId, hasPermission, hasAnyPermission]);

  if (["/setup", "/setup-v2", "/login"].includes(router.pathname)) return null;

  const handleSignOut = () => {
    setSelectedGuildId(null);
    authClient.signOut();
    router.push("/login");
  };

  return (
    <nav className="z-50 bg-[#06234A] px-9 py-3.5 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="relative h-16 w-[200px]">
            <Image
              src="/logo.svg"
              alt="Logo"
              fill
              priority
              sizes="200px"
              className="object-contain object-left"
            />
          </div>

          <div className="flex min-w-[160px] space-x-6">
            {navItems.map((item) => {
              const isVisible = visibleNavItems.includes(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                    !isVisible && "pointer-events-none opacity-0",
                    router.pathname === item.href
                      ? "bg-primary-focused text-white"
                      : "text-muted-text hover:bg-white/10 hover:text-white"
                  )}
                  tabIndex={isVisible ? 0 : -1}
                  aria-hidden={!isVisible}
                >
                  {item.label}
                </Link>
              );
            })}
            {session?.user && visibleNavItems.length <= 1 && (
              <span className="text-muted-text px-3 py-2 text-sm">
                {!selectedGuildId
                  ? "Select a server to access features"
                  : "Limited access - contact server admin"}
              </span>
            )}
          </div>
        </div>

        <div className="flex h-10 min-w-[200px] items-center gap-4">
          {isPending && !session ? (
            <div className="flex w-full items-center justify-end gap-4">
              <Skeleton className="h-10 w-40 rounded-full bg-white/10" />
            </div>
          ) : session?.user ? (
            <div className="animate-fade-in flex items-center gap-4">
              {selectedGuildId && <ServerSelectDropdown />}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="bg-primary-focused ring-ring-primary stable-hover flex h-10 min-w-[120px] max-w-[200px] items-center rounded-full p-1.5 pr-3 ring-1 transition-colors hover:bg-white/20">
                    <StableAvatar
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      size={28}
                      className="mb-[1px]"
                      fallbackClassName="bg-orange-500"
                    />
                    <span className="ml-2 mr-1 max-w-[120px] truncate text-sm tracking-wide text-white">
                      {session.user.name}
                    </span>
                    <MdOutlineArrowDropDown className="mt-[1px] size-5 text-[#CFCFCF]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 size-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <button
              onClick={() => {
                authClient.signIn.social({
                  provider: "discord",
                  callbackURL: env.authCallbackUrl,
                });
              }}
              className="animate-fade-in flex h-10 min-w-[160px] items-center justify-center rounded bg-white/20 px-3 py-1 text-sm transition-colors hover:bg-white/30"
            >
              Sign in with Discord
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
