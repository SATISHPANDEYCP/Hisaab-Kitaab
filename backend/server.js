import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectToMongoDB from "./config/dbConnection.js";
import userRoutes from "./routes/user.route.js";
import tripRoutes from "./routes/trip.route.js";
import expenseRoutes from "./routes/expense.route.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// In production, allow only configured origins. In development, allow all.
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/expenses", expenseRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({ message: `Server running on port ${PORT}` });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
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
