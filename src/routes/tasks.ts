import express from "express"
import { body, validationResult } from "express-validator"
import { agentOrchestrator } from "../server"
import { logger } from "../utils/logger"
import { dbManager } from "../utils/dbManager" // Declare dbManager

const router = express.Router()

// Submit a new task
router.post(
  "/submit",
  [body("prompt").isString().isLength({ min: 1, max: 5000 }).trim(), body("context").optional().isObject()],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { prompt, context = {} } = req.body
      const userId = req.user.id

      const taskId = await agentOrchestrator.submitTask(userId, prompt, context)

      res.status(201).json({
        success: true,
        taskId,
        message: "Task submitted successfully",
      })
    } catch (error) {
      logger.error("Task submission error:", error)
      res.status(500).json({
        success: false,
        error: "Failed to submit task",
      })
    }
  },
)

// Get task status
router.get("/:taskId/status", async (req, res) => {
  try {
    const { taskId } = req.params
    const userId = req.user.id

    // Query task from database
    const result = await dbManager.query("SELECT * FROM tasks WHERE id = $1 AND user_id = $2", [taskId, userId])

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Task not found",
      })
    }

    const task = result.rows[0]
    res.json({
      success: true,
      task: {
        id: task.id,
        status: task.status,
        result: task.result ? JSON.parse(task.result) : null,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
      },
    })
  } catch (error) {
    logger.error("Task status error:", error)
    res.status(500).json({
      success: false,
      error: "Failed to get task status",
    })
  }
})

// Get user's task history
router.get("/history", async (req, res) => {
  try {
    const userId = req.user.id
    const page = Number.parseInt(req.query.page as string) || 1
    const limit = Number.parseInt(req.query.limit as string) || 20
    const offset = (page - 1) * limit

    const result = await dbManager.query(
      "SELECT id, prompt, status, created_at, updated_at FROM tasks WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [userId, limit, offset],
    )

    res.json({
      success: true,
      tasks: result.rows,
      pagination: {
        page,
        limit,
        total: result.rowCount,
      },
    })
  } catch (error) {
    logger.error("Task history error:", error)
    res.status(500).json({
      success: false,
      error: "Failed to get task history",
    })
  }
})

export default router
