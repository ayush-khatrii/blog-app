import { Hono } from 'hono'
import { userRouter } from './routes/user';
import { blogRouter } from './routes/blog';
import { cors } from 'hono/cors'

const app = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_TOKEN: string;
  }
}>();

app.use('/*', cors());
// root route  
app.get('/', (c) => c.text('Hello Hono blog home page!'));

// all routes
app.route("/api/v1", userRouter);
app.route("/api/v1/blog", blogRouter);



export default app;