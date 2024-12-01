import { Hono } from "hono";
import { Post, PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { verify } from "hono/jwt";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_TOKEN: string;
  },
  Variables: {
    userId: string;
  }
}>();


// AUTH MIDDLEWARE
blogRouter.use("/*", async (c, next) => {
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

// POST ROUTE
blogRouter.post('/', async (c) => {
  const body = await c.req.json();
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());
  const authorId = c.get("userId");

  try {
    const blogPost = await prisma.post.create({
      data: {
        title: body.title,
        content: body.content,
        authorId: Number(authorId)
      }
    });
    return c.json({
      message: "Blog posted successfully!",
      id: blogPost.id
    }, 200);

  } catch (error: any) {
    return c.json({
      message: error.message
    }, 500)
  }
});

// PUT ROUTE
blogRouter.put('/:id', async (c) => {
  const body = await c.req.json();
  const blogId = c.req.param("id");
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const blogPost = await prisma.post.update({
      where: {
        id: Number(blogId)
      },
      data: {
        title: body.title,
        content: body.content
      }
    });

    if (!blogPost) {
      return c.json({
        message: `Blog post with id ${blogId} not  found!`,
      }, 404)
    }

    return c.json({
      message: `Blog post with id ${blogId} updated successfully!`,
      id: blogPost
    }, 200)

  } catch (error: any) {
    return c.json({
      message: error.message
    }, 500)
  }
});

// DELETE ROUTE
blogRouter.delete('/:id', async (c) => {
  const blogId = c.req.param("id")
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const blogPost = await prisma.post.delete({
      where: {
        id: Number(blogId)
      },
    });

    if (!blogPost) {
      return
    }

    return c.json({
      message: "Blog Post deleted successfully!",
      id: blogPost.id
    }, 200)

  } catch (error: any) {
    return c.json({
      message: error.message
    }, 500)
  }
});

// GET A SPECIFIC BLOG ROUTE
blogRouter.get('/:id', async (c) => {
  const blogId = c.req.param("id");
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const blogPost = await prisma.post.findFirst({
      where: {
        id: Number(blogId)
      },
    });

    if (!blogPost) {
      return c.json({
        message: "Blog post not found!"
      })
    }
    return c.json({
      id: blogPost
    }, 200)

  } catch (error: any) {
    return c.json({
      message: error.message
    }, 500)
  }
});

blogRouter.get('/', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const blogPosts = await prisma.post.findMany({
      select: {
        content: true,
        thumbnail: true,
        createdAt: true,
        isPublished: true,
        title: true,
        id: true,
        author: {
          select: {
            name: true
          }
        }
      }
    });
    const count = await prisma.post.count();

    if (!blogPosts) {
      return c.json({
        message: "Blog posts not found!",
      }, 404);
    }
    return c.json({
      blogPosts,
      total: count
    }, 200)
  } catch (error: any) {
    return c.json({
      message: error.message
    }, 500)
  }
});


