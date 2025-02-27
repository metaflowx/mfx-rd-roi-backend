import { Hono } from "hono";
import { cors } from "hono/cors";
import * as dotenv from "dotenv"
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { errorHandler, notFound } from "./middleware";
import { connectMongoDB } from './config/dbConnect';


import { Users, Admin , PackagePlan , Task, Investment, Referral, Dashboard} from './routes'

const app = new Hono().basePath("/api");

app.use("*", logger(), prettyJSON());

const db_url = process.env.DB_URL
connectMongoDB(db_url as string, 'roi-backend')

// Allow CORS globally
app.use(
  cors({
    origin: "*", // Allow all origins
    allowMethods: ["GET", "POST", "PUT", "DELETE"], // Allow specific HTTP methods
    allowHeaders: ["Content-Type", "Authorization", "token"], // Allow specific headers
    credentials: true,
  })
);


// ✅ Serve static files from the "uploads" directory using Bun's built-in file serving
app.use("/uploads/*", async (c) => {
  const filePath = `./uploads/${c.req.param("*")}`; // Get the file path from URL
  return new Response(Bun.file(filePath)); // Serve the file
});

/// Health Check
app.get("/", (c) => {
  return c.json({
    code:400,
    message:"healthy"
  });
});

/// Routes part start

app.route('/v1/user', Users);
app.route('/v1/admin', Admin);
app.route('/v1/pacakage', PackagePlan);
app.route('/v1/task', Task);
app.route('/v1/investment', Investment);
app.route('/v1/referral', Referral);
app.route('/v1/dashboard', Dashboard);



/// Routes Part end

app.onError((_err,c)=>{
  const error = errorHandler(c)
  return error
})

app.notFound((c) => {
  const error = notFound(c)
  return error
})

const port = Bun.env.PORT || 8000

export default {
    port,
    fetch:app.fetch
}
