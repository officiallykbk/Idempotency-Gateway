import jwt from "jsonwebtoken";

export function generateTokens(User:any){
  return jwt.sign({ id: User.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
}
