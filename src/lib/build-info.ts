export const BUILD_INFO = {
  app: "ANZRBO",
  expectedVercelOutputDirectory: ".output",
  publicOutputDirectory: ".output/public",
  serverOutputDirectory: ".output/server",
  buildMode: import.meta.env.MODE,
  builtAt: new Date().toISOString(),
  vercelEnv: import.meta.env.VITE_VERCEL_ENV ?? "local/preview",
  vercelUrl: import.meta.env.VITE_VERCEL_URL ?? "",
  commitSha: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA ?? "",
} as const;