export type LogLevel = 'info' | 'debug' | 'warn' | 'error';

export function log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  const ts = new Date().toISOString();
  const payload = data ? ` ${JSON.stringify(data)}` : '';
  console.log(`[${ts}] [${level.toUpperCase()}] ${message}${payload}`);
}
