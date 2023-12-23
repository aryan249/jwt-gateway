import winston from 'winston';

const { combine, timestamp, json, colorize, printf } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
  }),
);

const prodFormat = combine(timestamp(), json());

export function createLogger(level = 'info') {
  return winston.createLogger({
    level,
    format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
    transports: [new winston.transports.Console()],
    silent: process.env.NODE_ENV === 'test',
  });
}

export const logger = createLogger(process.env.LOG_LEVEL || 'info');
// Configure file transport for production environments
// Support multiple transports
// Structured logging for audit trail
// Log rotation configuration
