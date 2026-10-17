

export const cookieOptions = {
  httpOnly: true, //   (XSS protection)
  secure: process.env.NODE_ENV === 'production', 
  sameSite: 'none',  
  maxAge: 1 * 24 * 60 * 60 * 1000 // 7 days expiry
};