//-----------------------------------------------------
// auth.types.ts
//-----------------------------------------------------
import { Request } from 'express';


export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}


export interface JwtPayload {
  id: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload; 
}