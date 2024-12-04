import { Context } from "hono";
import { verify } from "hono/jwt";

export const authMiddleware = async (c: Context, next: () => Promise<void>) => {
  const authHeader = c.req.header("authorization");

  if (!authHeader) {
    return c.json({
      message: "Auth Token not found!"
    }, 401);
  }

  try {
    const jwtPayload = await verify(authHeader, c.env?.JWT_TOKEN);
    const userId = jwtPayload.id;
    if (userId) {
      c.set("userId", userId.toString());
      await next();
    } else {
      return c.json({ message: "You are not logged in!" }, 403);
    }
  } catch (error) {
    return c.json({ message: "Invalid or expired token!" }, 403);
  }
};