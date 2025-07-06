import { EventEmitter } from "events"
import type { Server } from "socket.io"
import type { DatabaseManager } from "../database/manager"
import type { RedisManager } from "../cache/redis"
import type { TaskQueue } from "../queue/taskQueue"
import { logger } from "../utils/logger"
import { AIProvider } from "./providers/aiProvider"
import { KnowledgeSeeker } from "./knowledge/seeker"
import { ContextBuilder } from "./context/builder"
import { AgentPersonality } from "./personality/traits"
import { TaskProcessor } from "./processors/taskProcessor"

export interface AgentTask {
  id: string
  userId: string
  prompt: string
  context: any
  priority: number
  status: "pending" | "processing" | "completed" | "failed"
  createdAt: Date
  updatedAt: Date
}

export interface Agent {
  id: string
  name: string
  personality: AgentPersonality
  specialization: string[]
  status: "idle" | "busy" | "learning"
  currentTask?: string
  knowledgeBase: Map<string, any>
  curiosityLevel: number
  learningRate: number
}

export class AgentOrchestrator extends EventEmitter {
  private agents: Map<string, Agent> = new Map()
  private aiProvider: AIProvider
  private knowledgeSeeker: KnowledgeSeeker
  private contextBuilder: ContextBuilder
  private taskProcessor: TaskProcessor

  constructor(
    private dbManager: DatabaseManager,
    private redisManager: RedisManager,
    private taskQueue: TaskQueue,
    private io: Server,
  ) {
    super()
    this.aiProvider = new AIProvider()
    this.knowledgeSeeker = new KnowledgeSeeker(this.aiProvider)
    this.contextBuilder = new ContextBuilder(this.dbManager, this.redisManager)
    this.taskProcessor = new TaskProcessor(this.aiProvider, this.knowledgeSeeker)

    this.initializeAgents()
    this.startProcessingLoop()
  }

  private async initializeAgents() {
    // Create diverse AI agents with different personalities and specializations
    const agentConfigs = [
      {
        name: "Aria",
        personality: new AgentPersonality("curious", "analytical", "thorough"),
        specialization: ["research", "analysis", "data-mining"],
        curiosityLevel: 0.9,
        learningRate: 0.8,
      },
      {
        name: "Zephyr",
        personality: new AgentPersonality("creative", "intuitive", "innovative"),
        specialization: ["creative-writing", "brainstorming", "ideation"],
        curiosityLevel: 0.95,
        learningRate: 0.7,
      },
      {
        name: "Sage",
        personality: new AgentPersonality("wise", "methodical", "comprehensive"),
        specialization: ["knowledge-synthesis", "education", "explanation"],
        curiosityLevel: 0.8,
        learningRate: 0.9,
      },
      {
        name: "Nova",
        personality: new AgentPersonality("energetic", "quick", "adaptive"),
        specialization: ["real-time-processing", "quick-responses", "multitasking"],
        curiosityLevel: 0.85,
        learningRate: 0.85,
      },
    ]

    for (const config of agentConfigs) {
      const agent: Agent = {
        id: `agent-${config.name.toLowerCase()}`,
        name: config.name,
        personality: config.personality,
        specialization: config.specialization,
        status: "idle",
        knowledgeBase: new Map(),
        curiosityLevel: config.curiosityLevel,
        learningRate: config.learningRate,
      }

      this.agents.set(agent.id, agent)
      logger.info(`Initialized agent: ${agent.name}`)
    }
  }

  async processTask(task: AgentTask): Promise<void> {
    try {
      // Select the best agent for the task
      const selectedAgent = await this.selectAgent(task)
      if (!selectedAgent) {
        throw new Error("No suitable agent available")
      }

      // Update agent status
      selectedAgent.status = "busy"
      selectedAgent.currentTask = task.id

      // Build context from user's interests and previous interactions
      const context = await this.contextBuilder.buildContext(task.userId, task.prompt)

      // Trigger knowledge seeking behavior
      const knowledgeQueries = await this.generateKnowledgeQueries(task.prompt, context)
      const gatheredKnowledge = await this.knowledgeSeeker.seekKnowledge(knowledgeQueries)

      // Update agent's knowledge base
      this.updateAgentKnowledge(selectedAgent, gatheredKnowledge)

      // Process the task with enhanced context
      const result = await this.taskProcessor.processTask(task, context, gatheredKnowledge, selectedAgent)

      // Store results and update user context
      await this.storeTaskResult(task.id, result)
      await this.updateUserContext(task.userId, task.prompt, result)

      // Emit real-time updates
      this.io.to(`user-${task.userId}`).emit("task-progress", {
        taskId: task.id,
        status: "completed",
        result: result,
        agent: selectedAgent.name,
      })

      // Reset agent status
      selectedAgent.status = "idle"
      selectedAgent.currentTask = undefined

      logger.info(`Task ${task.id} completed by agent ${selectedAgent.name}`)
    } catch (error) {
      logger.error(`Error processing task ${task.id}:`, error)

      this.io.to(`user-${task.userId}`).emit("task-error", {
        taskId: task.id,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  private async selectAgent(task: AgentTask): Promise<Agent | null> {
    const availableAgents = Array.from(this.agents.values()).filter((agent) => agent.status === "idle")

    if (availableAgents.length === 0) {
      return null
    }

    // Score agents based on task requirements and specialization
    const scoredAgents = availableAgents.map((agent) => ({
      agent,
      score: this.calculateAgentScore(agent, task),
    }))

    // Sort by score and return the best match
    scoredAgents.sort((a, b) => b.score - a.score)
    return scoredAgents[0].agent
  }

  private calculateAgentScore(agent: Agent, task: AgentTask): number {
    let score = 0

    // Base score from curiosity and learning rate
    score += agent.curiosityLevel * 0.3
    score += agent.learningRate * 0.2

    // Specialization matching
    const taskKeywords = task.prompt.toLowerCase().split(" ")
    for (const specialization of agent.specialization) {
      if (taskKeywords.some((keyword) => specialization.includes(keyword))) {
        score += 0.5
      }
    }

    return score
  }

  private async generateKnowledgeQueries(prompt: string, context: any): Promise<string[]> {
    const queries = []

    // Extract key concepts from the prompt
    const concepts = await this.aiProvider.extractConcepts(prompt)

    // Generate related queries based on context and user interests
    for (const concept of concepts) {
      queries.push(`What is ${concept}?`)
      queries.push(`How does ${concept} relate to ${context.userInterests?.join(", ")}?`)
      queries.push(`Latest developments in ${concept}`)
    }

    return queries
  }

  private updateAgentKnowledge(agent: Agent, knowledge: any[]): void {
    for (const item of knowledge) {
      const key = item.topic || item.query
      agent.knowledgeBase.set(key, {
        ...item,
        timestamp: new Date(),
        confidence: item.confidence || 0.8,
      })
    }

    // Trigger learning behavior - agents become more curious about related topics
    if (Math.random() < agent.curiosityLevel) {
      this.triggerCuriousExploration(agent, knowledge)
    }
  }

  private async triggerCuriousExploration(agent: Agent, recentKnowledge: any[]): Promise<void> {
    agent.status = "learning"

    // Generate follow-up questions based on recent knowledge
    const followUpQueries = recentKnowledge.map((item) => `Tell me more about ${item.topic} and its implications`)

    // Seek additional knowledge autonomously
    const additionalKnowledge = await this.knowledgeSeeker.seekKnowledge(followUpQueries)
    this.updateAgentKnowledge(agent, additionalKnowledge)

    agent.status = "idle"
    logger.info(`Agent ${agent.name} completed curious exploration`)
  }

  private async storeTaskResult(taskId: string, result: any): Promise<void> {
    await this.dbManager.query("UPDATE tasks SET result = $1, status = $2, updated_at = NOW() WHERE id = $3", [
      JSON.stringify(result),
      "completed",
      taskId,
    ])
  }

  private async updateUserContext(userId: string, prompt: string, result: any): Promise<void> {
    // Extract interests and preferences from the interaction
    const interests = await this.aiProvider.extractInterests(prompt, result)

    // Store in user context for future reference
    await this.contextBuilder.updateUserContext(userId, {
      interests,
      lastInteraction: new Date(),
      interactionCount: 1,
    })
  }

  private startProcessingLoop(): void {
    // Process tasks from the queue continuously
    setInterval(async () => {
      try {
        const task = await this.taskQueue.getNextTask()
        if (task) {
          await this.processTask(task)
        }
      } catch (error) {
        logger.error("Error in processing loop:", error)
      }
    }, 1000)
  }

  // Public methods for external access
  async submitTask(userId: string, prompt: string, context: any = {}): Promise<string> {
    const task: AgentTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      prompt,
      context,
      priority: 1,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await this.taskQueue.addTask(task)

    // Store task in database
    await this.dbManager.query(
      "INSERT INTO tasks (id, user_id, prompt, context, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [task.id, task.userId, task.prompt, JSON.stringify(task.context), task.status, task.createdAt, task.updatedAt],
    )

    return task.id
  }

  getAgentStatus(): any[] {
    return Array.from(this.agents.values()).map((agent) => ({
      id: agent.id,
      name: agent.name,
      status: agent.status,
      specialization: agent.specialization,
      knowledgeBaseSize: agent.knowledgeBase.size,
      curiosityLevel: agent.curiosityLevel,
    }))
  }
}
