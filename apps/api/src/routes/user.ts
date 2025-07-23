import { Hono } from "hono";
import preferences from "./user/preferences";

const app = new Hono();

// Mount sub-routes
app.route("/preferences", preferences);

export { app as user };
