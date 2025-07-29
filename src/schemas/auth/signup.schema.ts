import { z } from "zod";

export const signupSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),

  email: z.string().email("Invalid email format"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),

  role: z.enum(["USER", "ADMIN"]).optional().default("USER"),

  // 🎯 Modern UX: Auto-login option (defaults to true for better experience)
  autoLogin: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether to automatically log in the user after signup"),
});
