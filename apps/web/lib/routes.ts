export const routeConfig = {
  public: ["/login", "/api", "/_next", "/favicon.ico"],
  authOnly: ["/setup", "/setup-v2", "/user/settings"],
  requiresGuild: ["/tickets", "/test-auth"],
  home: "/",
} as const;

export type RouteType = "public" | "authOnly" | "requiresGuild";

export function getRouteType(pathname: string): RouteType {
  if (routeConfig.public.some((route) => pathname.startsWith(route))) {
    return "public";
  }

  if (routeConfig.authOnly.some((route) => pathname.startsWith(route))) {
    return "authOnly";
  }

  if (routeConfig.requiresGuild.some((route) => pathname.startsWith(route))) {
    return "requiresGuild";
  }

  if (pathname === routeConfig.home) {
    return "public";
  }

  return "requiresGuild";
}

export function getAuthRedirect(
  authState: "unauthenticated" | "no-guild" | "authenticated"
): string | null {
  switch (authState) {
    case "unauthenticated":
      return "/login";
    case "no-guild":
      return "/setup";
    case "authenticated":
      return null;
  }
}

export function isRouteAllowed(
  pathname: string,
  authState: "unauthenticated" | "no-guild" | "authenticated"
): boolean {
  const routeType = getRouteType(pathname);

  switch (routeType) {
    case "public":
      return true;

    case "authOnly":
      return authState !== "unauthenticated";

    case "requiresGuild":
      return authState === "authenticated";
  }
}
