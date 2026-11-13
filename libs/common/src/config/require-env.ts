export function requireEnv(...keys: string[]) {
  return (config: Record<string, unknown>): Record<string, unknown> => {
    const missing = keys.filter((key) => !config[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}`,
      );
    }

    return config;
  };
}
