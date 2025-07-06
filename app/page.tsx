"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Paperclip, ImageIcon, FileText, Square, Mic, Globe, BookOpen, ArrowUp } from "lucide-react"

export default function HomePage() {
  const [inputValue, setInputValue] = useState("")
  const [activeCategory, setActiveCategory] = useState("Featured")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputValue.trim()) {
      setError("Please enter a task or question")
      return
    }

    setIsSubmitting(true)
    setError("")
    setSuccess("")

    try {
      // Simulate API call - replace with actual submission logic
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Here you would typically send the data to your backend
      const formData = new FormData()
      formData.append("task", inputValue)
      formData.append("category", activeCategory)

      uploadedFiles.forEach((file, index) => {
        formData.append(`file_${index}`, file)
      })

      // Example API call (uncomment and modify for your backend):
      // const response = await fetch('/api/submit-task', {
      //   method: 'POST',
      //   body: formData
      // })
      //
      // if (!response.ok) {
      //   throw new Error('Failed to submit task')
      // }

      setSuccess("Task submitted successfully!")
      setInputValue("")
      setUploadedFiles([])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit task. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setUploadedFiles((prev) => [...prev, ...files])
      setSuccess(`${files.length} file(s) uploaded successfully`)
      setTimeout(() => setSuccess(""), 3000)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setUploadedFiles((prev) => [...prev, ...files])
      setSuccess(`${files.length} image(s) uploaded successfully`)
      setTimeout(() => setSuccess(""), 3000)
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Clear messages after 5 seconds
  React.useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("")
        setSuccess("")
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  const categories = ["Featured", "Research", "Data", "Edu", "Productivity", "Programming"]

  const contentTypes = [
    { icon: FileText, label: "Slides" },
    { icon: ImageIcon, label: "Image" },
    { icon: Square, label: "Video" },
    { icon: Mic, label: "Audio" },
    { icon: Globe, label: "Webpage" },
    { icon: BookOpen, label: "Playbook" },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="text-xl font-semibold">agentcy</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
          <Button size="sm">Sign up</Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-light text-gray-900 mb-2">Hello</h1>
          <p className="text-xl text-gray-500">What can I do for you?</p>
        </div>

        {/* Input Section */}
        <div className="max-w-2xl mx-auto mb-8">
          <form onSubmit={handleSubmit} className="relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Give Agentcy a task to work on..."
              className="w-full h-14 pl-4 pr-20 text-base border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <Paperclip className="h-4 w-4 text-gray-400" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => document.getElementById("image-input")?.click()}
              >
                <ImageIcon className="h-4 w-4 text-gray-400" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                <Mic className="h-4 w-4 text-gray-400" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                <Square className="h-4 w-4 text-gray-400" />
              </Button>
              <Button
                type="submit"
                size="icon"
                className="h-8 w-8 bg-gray-900 hover:bg-gray-800 disabled:opacity-50"
                disabled={!inputValue.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4 text-white" />
                )}
              </Button>
            </div>

            {/* Hidden file inputs */}
            <input
              id="file-input"
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.txt"
            />
            <input id="image-input" type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
          </form>

          {/* Error/Success Messages */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}
          {success && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          {/* Uploaded files display */}
          {uploadedFiles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1 text-sm">
                  <span>{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0"
                    onClick={() => removeFile(index)}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content Type Buttons */}
        <div className="flex justify-center gap-4 mb-12 flex-wrap">
          {contentTypes.map((type) => (
            <Button
              key={type.label}
              variant="outline"
              className="flex items-center gap-2 h-10 px-4 rounded-full border-gray-200 hover:bg-gray-50 bg-transparent"
            >
              <type.icon className="h-4 w-4" />
              {type.label}
            </Button>
          ))}
        </div>

        {/* Category Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-1 bg-white rounded-full p-1 border">
            {categories.map((category) => (
              <Button
                key={category}
                variant={activeCategory === category ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveCategory(category)}
                className={`rounded-full px-4 h-8 text-sm ${
                  activeCategory === category
                    ? "bg-black text-white hover:bg-gray-800"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-sm text-gray-400 mb-8">
          AI-generated content is voluntarily shared by users and will not be displayed without consent.
        </p>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, index) => (
            <Card
              key={index}
              className="aspect-square bg-gray-200 border-0 rounded-xl hover:bg-gray-300 transition-colors cursor-pointer"
            >
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-12 h-12 bg-gray-300 rounded-lg"></div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
