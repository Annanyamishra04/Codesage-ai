import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72; // bcrypt silently truncates beyond 72 bytes
export const MAX_NAME_LENGTH = 80;

export const registerRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please enter your name.")
    .max(MAX_NAME_LENGTH, "Name is too long."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Please enter your email.")
    .email("Please enter a valid email address.")
    .max(254),
  password: z
    .string()
    .min(
      MIN_PASSWORD_LENGTH,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    )
    .max(MAX_PASSWORD_LENGTH, "Password is too long."),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Please enter your email.").max(254),
  password: z.string().min(1, "Please enter your password.").max(MAX_PASSWORD_LENGTH),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;
