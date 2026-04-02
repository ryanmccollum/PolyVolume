export type Level = 'info' | 'warn' | 'error' | 'debug';

export function log(level: Level, message: string, meta?: Record<string, unknown>) {
  const payload = meta ? ` ${JSON.stringify(meta)}` : '';
  console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}${payload}`);
}
