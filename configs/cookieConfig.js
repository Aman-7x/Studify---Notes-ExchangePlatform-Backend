

export const cookieOptions = {
  httpOnly: true, //   (XSS protection)
  secure: true, 
  sameSite: 'none',  
  maxAge: 1 * 24 * 60 * 60 * 1000 
};