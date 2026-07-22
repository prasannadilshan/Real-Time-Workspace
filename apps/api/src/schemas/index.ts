import { z } from "zod";

// AUTH SCHEMAS
const passwordComplexity = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const registerBodySchema = z.object({
    email: z.email(),
    password: passwordComplexity,
    firstName: z.string().min(1),
    lastName: z.string().min(1).max(100).trim(),
    username: z.string().min(1).max(100).trim(),
});

export const loginBodySchema = z.object({
    email: z.email(),
    password: z.string().min(8),
});

// DOCUMENT SCHEMAS 
export const createDocSchema = z.object({
    title: z.string().min(1).max(225).trim(),
    content: z.string().default("")
});

export const updateDocSchema = createDocSchema.partial();

// COLLABORATOR SCHEMAS
export const addCollaboratorSchema = z.object({
    profileId: z.string(),
    role: z.enum(["editor", "viewer"]),
});

export const updateCollaboratorSchema = addCollaboratorSchema.partial();