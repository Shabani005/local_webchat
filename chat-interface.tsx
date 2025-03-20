"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2, Bot, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [models, setModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch available models on component mount
  useEffect(() => {
    fetch("http://localhost:1234/v1/models")
      .then((response) => response.json())
      .then((data) => {
        const modelIds = data.data.map((item: any) => item.id)
        setModels(modelIds)
      })
      .catch((error) => console.error("Error fetching models:", error))
  }, [])

  // Scroll to bottom of messages when new messages are added
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!input.trim() || !selectedModel) return

    const userMessage = input
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("http://localhost:1234/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: "user", content: userMessage }],
        }),
      })

      const data = await response.json()
      const aiResponse = data?.choices?.[0]?.message?.content || "No response from AI"

      setMessages((prev) => [...prev, { role: "assistant", content: aiResponse }])
    } catch (error) {
      console.error("Error:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, there was an error processing your request.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-3xl h-[80vh] flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Chat Interface
          </CardTitle>
        </CardHeader>

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Model selector */}
          <div className="p-4 border-b">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Messages area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                  Select a model and start chatting
                </div>
              ) : (
                messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`flex items-start gap-2 max-w-[80%] ${
                        message.role === "user" ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 rounded-full p-2 ${
                          message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div
                        className={`p-3 rounded-lg ${
                          message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2 max-w-[80%]">
                    <div className="flex-shrink-0 rounded-full p-2 bg-muted">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="p-3 rounded-lg bg-muted flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Thinking...
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        <CardFooter className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex w-full gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isLoading || !selectedModel}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim() || !selectedModel}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}

