import express from "express"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import rateLimit from "express-rate-limit"
import { createServer } from "http"
import { Server } from "socket.io"
import dotenv from "dotenv"

import { logger } from "./utils/logger"
import { errorHandler } from "./middleware/errorHandler"
import { authMiddleware } from "./middleware/auth"
import { DatabaseManager } from "./database/manager"
import { RedisManager } from "./cache/redis"
import { AgentOrchestrator } from "./agents/orchestrator"
import { TaskQueue } from "./queue/taskQueue"

// Routes
import authRoutes from "./routes/auth"
import taskRoutes from "./routes/tasks"
import agentRoutes from "./routes/agents"
import knowledgeRoutes from "./routes/knowledge"
import uploadRoutes from "./routes/upload"

dotenv.config()

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
})

const PORT = process.env.PORT || 3000

// Security middleware
app.use(helmet())
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
)
app.use(compression())

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
})
app.use(limiter)

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Initialize services
let dbManager: DatabaseManager
let redisManager: RedisManager
let agentOrchestrator: AgentOrchestrator
let taskQueue: TaskQueue

async function initializeServices() {
  try {
    // Initialize database
    dbManager = new DatabaseManager()
    await dbManager.connect()

    // Initialize Redis
    redisManager = new RedisManager()
    await redisManager.connect()

    // Initialize task queue
    taskQueue = new TaskQueue(redisManager)

    // Initialize agent orchestrator
    agentOrchestrator = new AgentOrchestrator(dbManager, redisManager, taskQueue, io)

    logger.info("All services initialized successfully")
  } catch (error) {
    logger.error("Failed to initialize services:", error)
    process.exit(1)
  }
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// API routes
app.use("/api/auth", authRoutes)
app.use("/api/tasks", authMiddleware, taskRoutes)
app.use("/api/agents", authMiddleware, agentRoutes)
app.use("/api/knowledge", authMiddleware, knowledgeRoutes)
app.use("/api/upload", authMiddleware, uploadRoutes)

// WebSocket connection handling
io.use(authMiddleware)
io.on("connection", (socket) => {
  logger.info(`Client connected: ${socket.id}`)

  socket.on("join-room", (userId: string) => {
    socket.join(`user-${userId}`)
  })

  socket.on("disconnect", () => {
    logger.info(`Client disconnected: ${socket.id}`)
  })
})

// Error handling middleware
app.use(errorHandler)

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" })
})

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully")
  server.close(() => {
    logger.info("Process terminated")
  })
})

// Start server
async function startServer() {
  await initializeServices()

  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`)
  })
}

startServer().catch((error) => {
  logger.error("Failed to start server:", error)
  process.exit(1)
})

export { io, dbManager, redisManager, agentOrchestrator, taskQueue }
