import type { GetServerSideProps, GetServerSidePropsContext } from "next";
import {
  getServerSession,
  determineAuthState,
  getSelectedGuildFromCookie,
  type ServerSession,
  type AuthState,
} from "./server-auth";
import { fetchUserGuilds, type Guild } from "./api-server";
import { parseCookies } from "./utils";

export interface BaseAuthProps {
  session: ServerSession | null;
  authState: AuthState;
}

export interface GuildAuthProps extends BaseAuthProps {
  guilds: Guild[];
  selectedGuildId: string | null;
}

// For public pages (login) - redirects if authenticated
export function withPublicRoute(): GetServerSideProps<BaseAuthProps> {
  return async (context) => {
    const session = await getServerSession(context.req);

    if (session) {
      // Check if they have a guild selected
      const cookies = parseCookies(context.req.headers.cookie || "");
      const selectedGuildId = getSelectedGuildFromCookie(cookies);

      // Redirect to appropriate page
      const destination = selectedGuildId ? "/dashboard" : "/setup";

      return {
        redirect: {
          destination,
          permanent: false,
        },
      };
    }

    return {
      props: {
        session: null,
        authState: "unauthenticated",
      },
    };
  };
}

// For auth-only pages (setup) - requires auth but no guild
export function withAuthRoute<P extends Record<string, any> = Record<string, any>>(
  getServerSidePropsFunc?: (
    context: GetServerSidePropsContext,
    session: ServerSession
  ) => Promise<{ props: P }>
): GetServerSideProps<BaseAuthProps & P> {
  return async (context) => {
    const session = await getServerSession(context.req);

    if (!session) {
      return {
        redirect: {
          destination: "/login",
          permanent: false,
        },
      };
    }

    // Check for selected guild in cookies
    const cookies = parseCookies(context.req.headers.cookie || "");
    const selectedGuildId = getSelectedGuildFromCookie(cookies);
    const authState = determineAuthState(session, selectedGuildId);

    if (authState === "authenticated") {
      return {
        redirect: {
          destination: "/dashboard",
          permanent: false,
        },
      };
    }

    // Get additional props if function provided
    const additionalProps = getServerSidePropsFunc
      ? await getServerSidePropsFunc(context, session)
      : { props: {} as P };

    return {
      props: {
        ...additionalProps.props,
        session,
        authState,
      },
    };
  };
}

// For guild-required pages (main app) - requires auth + guild
export function withGuildRoute<P extends Record<string, any> = Record<string, any>>(
  getServerSidePropsFunc?: (
    context: GetServerSidePropsContext,
    session: ServerSession,
    guildId: string,
    guilds: Guild[]
  ) => Promise<{ props: P }>
): GetServerSideProps<GuildAuthProps & P> {
  return async (context) => {
    const session = await getServerSession(context.req);

    if (!session) {
      return {
        redirect: {
          destination: "/login",
          permanent: false,
        },
      };
    }

    // Get selected guild from cookie
    const cookies = parseCookies(context.req.headers.cookie || "");
    const selectedGuildId = getSelectedGuildFromCookie(cookies);

    if (!selectedGuildId) {
      return {
        redirect: {
          destination: "/setup",
          permanent: false,
        },
      };
    }

    // Fetch guilds server-side
    const guilds = await fetchUserGuilds(context.req);

    // Verify selected guild is valid
    const validGuild = guilds.find((g) => g.id === selectedGuildId && g.connected);
    if (!validGuild) {
      // Clear invalid guild selection and redirect to setup
      context.res.setHeader(
        "Set-Cookie",
        "ticketsbot-selected-guild=; Path=/; Max-Age=0; HttpOnly"
      );

      return {
        redirect: {
          destination: "/setup",
          permanent: false,
        },
      };
    }

    const authState = "authenticated";

    // Get additional props if function provided
    const additionalProps = getServerSidePropsFunc
      ? await getServerSidePropsFunc(context, session, selectedGuildId, guilds)
      : { props: {} as P };

    return {
      props: {
        ...additionalProps.props,
        session,
        authState,
        guilds,
        selectedGuildId,
      },
    };
  };
}
