import { Hono } from "hono";
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { sign, verify } from 'hono/jwt'
import { signInInputs, signUpInputs } from "hono-blog-common";

export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_TOKEN: string
  },
  Variables: {
    userId: string;
  }
}>();

userRouter.post('/user/signup', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const { success } = signUpInputs.safeParse(body);

  if (!success) {
    return c.json({
      message: "Inputs are incorrect!"
    }, 411);
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: body.name,
        username: body.username,
        password: body.password
      }
    });
    if (!user) {
      return c.json({
        message: "Incorrect credentials"
      });
    }
    const token = await sign({
      id: user.id,
    }, c.env.JWT_TOKEN);

    console.log('sign-up data : ', token);
    return c.json({
      token
    }, 200);

  } catch (e) {
    return c.json({
      message: "Something went wrong!"
    }, 200);
  }
})
userRouter.post('/user/signin', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const { success } = signInInputs.safeParse(body);

  if (!success) {
    return c.json({
      message: "Incorrect credentials!"
    }, 411);
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        username: body.username,
        password: body.password
      }
    });
    if (!user) {
      return c.json({
        message: "Incorrect credentials"
      }, 403);
    }
    const token = await sign({
      id: user.id,
    }, c.env.JWT_TOKEN);

    console.log('sign-in data: ', token);
    return c.json({
      token
    }, 200);

  } catch (e) {
    console.log(e);
    return c.text("Invalid", 411);
  }
});

userRouter.use("/*", async (c, next) => {
  const authHeader = c.req.header("authorization");

  if (!authHeader) {
    return c.json({
      message: "Auth Token not found!"
    }, 404)
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
});
userRouter.get('/user/profile', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  const authHeader = c.req.header("authorization") || "";
  const jwtPayload = await verify(authHeader, c.env?.JWT_TOKEN);
  const userId = jwtPayload.id;
  const id = Number(userId);

  try {
    const user = await prisma.user.findFirst({
      where: {
        id
      },
      select: {
        id: true,
        name: true,
        username: true,
        Post: {
          select: {
            id: true,
            title: true,
            content: true,
            createdAt: true
          }
        }
      }
    });
    if (!user) {
      return c.json({
        message: "User not found!"
      }, 403);
    }
    const userData = user;
    const userPosts = user.Post

    return c.json({
      userData,
      userPosts
    }, 200);

  } catch (e) {
    console.log(e);
    return c.text("Invalid", 411);
  }
});

