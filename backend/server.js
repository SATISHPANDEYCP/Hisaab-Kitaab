import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectToMongoDB from "./config/dbConnection.js";
import { sessionConfig } from "./config/session.js";
import userRoutes from "./routes/user.route.js";
import tripRoutes from "./routes/trip.route.js";
import expenseRoutes from "./routes/expense.route.js";
import analyticsRoutes from "./routes/analytics.route.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const normalizeOrigin = (origin) => origin.trim().replace(/\/$/, "");

const isHostedFrontendOrigin = (origin) => {
  try {
    const host = new URL(origin).hostname;
    return host.endsWith(".vercel.app") || host.endsWith(".netlify.app");
  } catch {
    return false;
  }
};

const getConfiguredOrigins = () => {
  const originSources = [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    process.env.CORS_ORIGIN,
  ];

  return originSources
    .flatMap((value) => (value ? value.split(",") : []))
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
};

const allowedOrigins = getConfiguredOrigins();

if (allowedOrigins.length === 0) {
  allowedOrigins.push("http://localhost:5173");
}

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedRequestOrigin = normalizeOrigin(origin);

      if (allowedOrigins.includes(normalizedRequestOrigin)) {
        return callback(null, true);
      }

      if (process.env.NODE_ENV === "production" && isHostedFrontendOrigin(normalizedRequestOrigin)) {
        return callback(null, true);
      }

      console.warn(
        `CORS blocked origin: ${origin}. Allowed origins: ${allowedOrigins.join(", ")}`
      );

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionConfig);

// Routes
app.use("/api/users", userRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/analytics", analyticsRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({ message: `Server running on port ${PORT}` });
});

// Start server with DB connection
const startServer = async () => {
  try {
    await connectToMongoDB(process.env.URL_DB);

    app.listen(PORT, () => {
      console.log(`✅ Server is running on Port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
};

startServer();

export default app;
