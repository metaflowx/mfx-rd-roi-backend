import { Hono } from "hono";
import { task } from "../handlers";
import { protect, isAdmin ,uploadMiddleware } from "../middleware";

const taskRoutes = new Hono();

taskRoutes.post("/create", protect, isAdmin, uploadMiddleware, (c) => task.createTask(c));
taskRoutes.put("/edit/:id", protect, isAdmin, uploadMiddleware, (c) => task.editTask(c));
taskRoutes.delete("/delete/:id", protect, isAdmin, (c) => task.deleteTask(c));

taskRoutes.get("/", (c) => task.getTasks(c));
taskRoutes.get("/:id", (c) => task.getTaskById(c));

taskRoutes.post("/review/:id", protect, (c) => task.addReview(c));

export default taskRoutes;
