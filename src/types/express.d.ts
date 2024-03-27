import { JwtPayload } from './index';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      user?: JwtPayload;
    }
  }
}
