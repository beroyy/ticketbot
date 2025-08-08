import { toNodeHandler } from "better-auth/node";
import { auth } from "@ticketsbot/core/auth";

export default toNodeHandler(auth.handler);

export const config = {
  api: {
    bodyParser: false,
  },
};
