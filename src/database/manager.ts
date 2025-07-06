import { Pool, type PoolClient } from "pg"
import { logger } from "../utils/logger"

export class DatabaseManager {
  private pool: Pool

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect()
      await client.query("SELECT NOW()")
      client.release()
      logger.info("Database connected successfully")
    } catch (error) {
      logger.error("Database connection failed:", error)
      throw error
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now()
    try {
      const result = await this.pool.query(text, params)
      const duration = Date.now() - start
      logger.debug("Executed query", { text, duration, rows: result.rowCount })
      return result
    } catch (error) {
      logger.error("Query error:", { text, error })
      throw error
    }
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect()
  }

  async close(): Promise<void> {
    await this.pool.end()
    logger.info("Database connection closed")
  }
}
