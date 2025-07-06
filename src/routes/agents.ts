import express from "express"
import { agentOrchestrator } from "../server"
import { logger } from "../utils/logger"
import { dbManager } from "../utils/dbManager" // Declare dbManager

const router = express.Router()

// Get agent status
router.get("/status", async (req, res) => {
  try {
    const agentStatus = agentOrchestrator.getAgentStatus()

    res.json({
      success: true,
      agents: agentStatus,
    })
  } catch (error) {
    logger.error("Agent status error:", error)
    res.status(500).json({
      success: false,
      error: "Failed to get agent status",
    })
  }
})

// Get agent performance metrics
router.get("/metrics", async (req, res) => {
  try {
    const userId = req.user.id

    // Get task completion metrics
    const result = await dbManager.query(
      `
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tasks,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time
      FROM tasks 
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
    `,
      [userId],
    )

    const metrics = result.rows[0]

    res.json({
      success: true,
      metrics: {
        totalTasks: Number.parseInt(metrics.total_tasks),
        completedTasks: Number.parseInt(metrics.completed_tasks),
        failedTasks: Number.parseInt(metrics.failed_tasks),
        successRate: metrics.total_tasks > 0 ? ((metrics.completed_tasks / metrics.total_tasks) * 100).toFixed(2) : 0,
        avgProcessingTime: Number.parseFloat(metrics.avg_processing_time || 0).toFixed(2),
      },
    })
  } catch (error) {
    logger.error("Agent metrics error:", error)
    res.status(500).json({
      success: false,
      error: "Failed to get agent metrics",
    })
  }
})

export default router
