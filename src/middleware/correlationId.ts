import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

const MAX_ID_LENGTH = 128;

function isValidCorrelationId(id: string): boolean {
  return id.length > 0 && id.length <= MAX_ID_LENGTH;
}

export function correlationId() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const incoming = req.headers['x-request-id'] as string | undefined;
    const id = incoming && isValidCorrelationId(incoming) ? incoming : uuidv4();
    req.correlationId = id;
    res.setHeader('X-Request-ID', id);
    next();
  };
}
// Fix: memory leak in correlation ID storage
