import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuthCheck } from "@/features/user/hooks/use-auth-check";
import { LoadingSpinner } from "./loading-spinner";

interface AuthGateProps {
  children: React.ReactNode;
}

const publicRoutes = ["/login", "/setup"];

export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const { isAuthenticated, hasGuilds, isLoading } = useAuthCheck();

  useEffect(() => {
    if (isLoading) return;

    const currentPath = router.pathname;

    // Allow access to public routes
    if (publicRoutes.includes(currentPath)) {
      return;
    }

    // Redirect based on auth state
    if (!isAuthenticated) {
      router.push("/login");
    } else if (!hasGuilds) {
      router.push("/setup");
    }
  }, [isAuthenticated, hasGuilds, isLoading, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // For public routes or authenticated users with guilds, render children
  const isPublicRoute = publicRoutes.includes(router.pathname);
  const hasAccess = isPublicRoute || (isAuthenticated && hasGuilds);

  if (!hasAccess) {
    // Show loading while redirect is happening
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return <>{children}</>;
}
