// Route configuration for reference
// Note: Authentication is now handled server-side via HOCs
export const routeConfig = {
  public: ["/login", "/api", "/_next", "/favicon.ico"],
  authOnly: ["/setup", "/setup-v2", "/user/settings"],
  requiresGuild: ["/tickets", "/dashboard"],
  home: "/",
} as const;
