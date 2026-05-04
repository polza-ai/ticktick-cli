import { z } from 'zod';

export const globalConfigSchema = z.object({
  clientId: z.string().min(1, 'Client ID обязателен'),
  clientSecret: z.string().min(1, 'Client Secret обязателен'),
  accessToken: z.string().min(1, 'Access Token обязателен'),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.string().optional(),
  defaultProject: z.string().optional(),
  inboxId: z.string().optional(),
  apiBaseUrl: z.string().url().default('https://api.ticktick.com/open/v1'),
});

export const projectConfigSchema = z.object({
  defaultProject: z.string().optional(),
  defaultTags: z.array(z.string()).optional(),
  defaultPriority: z.number().min(0).max(5).optional(),
});

export type GlobalConfig = z.infer<typeof globalConfigSchema>;
export type ProjectConfig = z.infer<typeof projectConfigSchema>;

export interface ResolvedConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  apiBaseUrl: string;
  defaultProject?: string;
  inboxId?: string;
  defaultTags?: string[];
  defaultPriority?: number;
}
