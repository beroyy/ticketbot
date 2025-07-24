import { z } from "zod";

/**
 * Global Zod configuration for the web app
 * Sets up default error messages and localization
 */

// Configure Zod with custom error map for better UX
const customErrorMap = (issue: any, ctx: any) => {
  // Handle specific error types with user-friendly messages
  switch (issue.code) {
    case "invalid_type":
      if (issue.expected === "string") {
        return { message: "This field is required" };
      }
      if (issue.expected === "number") {
        return { message: "Please enter a valid number" };
      }
      break;
    case "too_small":
      if (issue.type === "string") {
        return { message: `Must be at least ${issue.minimum} characters` };
      }
      if (issue.type === "number") {
        return { message: `Must be at least ${issue.minimum}` };
      }
      break;
    case "too_big":
      if (issue.type === "string") {
        return { message: `Cannot exceed ${issue.maximum} characters` };
      }
      if (issue.type === "number") {
        return { message: `Cannot exceed ${issue.maximum}` };
      }
      break;
    case "invalid_string":
      if (issue.validation === "email") {
        return { message: "Please enter a valid email address" };
      }
      if (issue.validation === "url") {
        return { message: "Please enter a valid URL" };
      }
      break;
  }

  // Fallback to default message
  return { message: ctx.defaultError };
};

// Set the custom error map globally
// @ts-expect-error - setErrorMap types may vary
z.setErrorMap(customErrorMap);

// Export configured z for use throughout the app
export { z };

// Helper to format Zod errors for display
export function formatZodError(error: z.ZodError<any>): string {
  const issues = error.issues || [];
  const messages = issues.map((err: any) => {
    const path = err.path && err.path.length > 0 ? `${err.path.join(".")}: ` : "";
    return `${path}${err.message}`;
  });

  return messages.join("\n");
}

// Helper to get first error message
export function getFirstErrorMessage(error: z.ZodError<any>): string {
  const issues = error.issues || [];
  return issues[0]?.message || "Validation error";
}
