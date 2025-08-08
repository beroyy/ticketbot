import { createRoute } from "../factory";
import { compositions } from "../middleware/context";

export const authRoutes = createRoute().get("/me", ...compositions.authenticated, async (c) => {
  const user = c.get("user");
  return c.json({ user });
});
