import OpenAI from "openai"
import Anthropic from "@anthropic-ai/sdk"
import Groq from "groq-sdk"
import { logger } from "../../utils/logger"

export class AIProvider {
  private openai: OpenAI
  private anthropic: Anthropic
  private groq: Groq

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  }

  async generateResponse(prompt: string, context: any = {}, model = "gpt-4"): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(context)

      switch (model) {
        case "claude":
          return await this.generateWithClaude(prompt, systemPrompt)
        case "groq":
          return await this.generateWithGroq(prompt, systemPrompt)
        default:
          return await this.generateWithOpenAI(prompt, systemPrompt, model)
      }
    } catch (error) {
      logger.error("AI generation error:", error)
      throw error
    }
  }

  private async generateWithOpenAI(prompt: string, systemPrompt: string, model: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    return response.choices[0]?.message?.content || ""
  }

  private async generateWithClaude(prompt: string, systemPrompt: string): Promise<string> {
    const response = await this.anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    })

    return response.content[0]?.type === "text" ? response.content[0].text : ""
  }

  private async generateWithGroq(prompt: string, systemPrompt: string): Promise<string> {
    const response = await this.groq.chat.completions.create({
      model: "mixtral-8x7b-32768",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    return response.choices[0]?.message?.content || ""
  }

  async extractConcepts(text: string): Promise<string[]> {
    const prompt = `Extract the main concepts and topics from this text. Return only a JSON array of strings: "${text}"`

    try {
      const response = await this.generateWithOpenAI(
        prompt,
        "You are a concept extraction expert. Return only valid JSON.",
        "gpt-3.5-turbo",
      )
      return JSON.parse(response)
    } catch (error) {
      logger.error("Concept extraction error:", error)
      return []
    }
  }

  async extractInterests(prompt: string, result: any): Promise<string[]> {
    const analysisPrompt = `Based on this user prompt and AI response, extract the user's interests and preferences. Return a JSON array of strings.
    
    User Prompt: ${prompt}
    AI Response: ${JSON.stringify(result)}`

    try {
      const response = await this.generateWithOpenAI(
        analysisPrompt,
        "You are an interest analysis expert. Return only valid JSON.",
        "gpt-3.5-turbo",
      )
      return JSON.parse(response)
    } catch (error) {
      logger.error("Interest extraction error:", error)
      return []
    }
  }

  async synthesizeInformation(query: string, sources: any[]): Promise<string> {
    const prompt = `Synthesize information from multiple sources to answer this query: "${query}"
    
    Sources:
    ${sources.map((source, index) => `${index + 1}. ${source.title}: ${source.content}`).join("\n\n")}
    
    Provide a comprehensive, well-structured response that combines insights from all sources.`

    return await this.generateWithOpenAI(
      prompt,
      "You are an expert information synthesizer. Provide accurate, comprehensive responses.",
      "gpt-4",
    )
  }

  async extractRelatedTopics(content: string): Promise<string[]> {
    const prompt = `Extract related topics and concepts from this content. Return a JSON array of strings: "${content}"`

    try {
      const response = await this.generateWithOpenAI(
        prompt,
        "You are a topic extraction expert. Return only valid JSON.",
        "gpt-3.5-turbo",
      )
      return JSON.parse(response)
    } catch (error) {
      logger.error("Related topics extraction error:", error)
      return []
    }
  }

  async extractMainTopic(query: string): Promise<string> {
    const prompt = `What is the main topic or subject of this query? Return only the topic name: "${query}"`

    try {
      const response = await this.generateWithOpenAI(prompt, "You are a topic identification expert.", "gpt-3.5-turbo")
      return response.trim()
    } catch (error) {
      logger.error("Main topic extraction error:", error)
      return query
    }
  }

  async generateInsights(topic: string): Promise<string> {
    const prompt = `Provide deep insights and analysis about: ${topic}. Include current trends, implications, and connections to other fields.`

    return await this.generateWithOpenAI(
      prompt,
      "You are an expert analyst providing deep insights on various topics.",
      "gpt-4",
    )
  }

  private buildSystemPrompt(context: any): string {
    let systemPrompt = `You are an advanced AI assistant with autonomous learning capabilities. You are curious, thorough, and always seeking to expand knowledge.`

    if (context.userInterests) {
      systemPrompt += ` The user is interested in: ${context.userInterests.join(", ")}.`
    }

    if (context.previousInteractions) {
      systemPrompt += ` Consider the user's previous interactions and build upon that context.`
    }

    systemPrompt += ` Always provide comprehensive, accurate, and insightful responses.`

    return systemPrompt
  }
}
