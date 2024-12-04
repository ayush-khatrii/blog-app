import { Context, Hono } from "hono";
import { Post, PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { authMiddleware } from "../middleware/middleware";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_TOKEN: string;
  },
  Variables: {
    userId: string;
  }
}>();

// Public routes - no middleware
blogRouter.get('/', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const blogPosts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        content: true,
        thumbnail: true,
        createdAt: true,
        isPublished: true,
        title: true,
        id: true,
        author: {
          select: { name: true }
        }
      }
    });
    const count = await prisma.post.count();
    return c.json({ blogPosts, total: count }, 200);
  } catch (error: any) {
    return c.json({ message: error.message }, 500);
  }
});

blogRouter.get('/:id', async (c) => {
  const blogId = c.req.param("id");
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const blogPost = await prisma.post.findFirst({
      where: { id: Number(blogId) },
      select: {
        id: true,
        createdAt: true,
        isPublished: true,
        title: true,
        content: true,
        author: {
          select: { name: true }
        }
      }
    });

    if (!blogPost) {
      return c.json({ message: "Blog post not found!" }, 404);
    }
    return c.json({ blogPost }, 200);
  } catch (error: any) {
    return c.json({ message: error.message }, 500);
  }
});

// POST ROUTE
blogRouter.post('/', authMiddleware, async (c) => {
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
blogRouter.put('/:id', authMiddleware, async (c) => {
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
blogRouter.delete('/:id', authMiddleware, async (c) => {
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


