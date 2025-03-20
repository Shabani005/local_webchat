"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2, Bot, User, Moon, Sun, Plus, Menu, Settings, MessageSquare, Save, X } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

// Types for our application
interface Message {
  role: "user" | "assistant"
  content: string
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  model: string
  timestamp: number
}

interface ServerSettings {
  host: string
  port: string
}

export default function EnhancedChatInterface() {
  // State for the current conversation
  const [currentConversation, setCurrentConversation] = useState<Conversation>({
    id: generateId(),
    title: "New Conversation",
    messages: [],
    model: "",
    timestamp: Date.now(),
  })

  // State for all conversations
  const [conversations, setConversations] = useState<Conversation[]>([])

  // UI state
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [models, setModels] = useState<string[]>([])
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Server settings
  const [serverSettings, setServerSettings] = useState<ServerSettings>({
    host: "localhost",
    port: "1234",
  })

  // Temporary settings (for editing)
  const [tempSettings, setTempSettings] = useState<ServerSettings>({
    host: "localhost",
    port: "1234",
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Helper function to generate a unique ID
  function generateId() {
    return Math.random().toString(36).substring(2, 15)
  }

  // Initialize from localStorage
  useEffect(() => {
    // Load dark mode preference
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setIsDarkMode(true)
      document.documentElement.classList.add("dark")
    }

    // Load conversations
    const savedConversations = localStorage.getItem("conversations")
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations)
        setConversations(parsed)

        // If there are saved conversations, load the most recent one
        if (parsed.length > 0) {
          setCurrentConversation(parsed[0])
        }
      } catch (e) {
        console.error("Failed to parse saved conversations", e)
      }
    }

    // Load server settings
    const savedSettings = localStorage.getItem("serverSettings")
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setServerSettings(parsed)
        setTempSettings(parsed)
      } catch (e) {
        console.error("Failed to parse saved settings", e)
      }
    }
  }, [])

  // Save conversations to localStorage when they change
  useEffect(() => {
    localStorage.setItem("conversations", JSON.stringify(conversations))
  }, [conversations])

  // Save server settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem("serverSettings", JSON.stringify(serverSettings))
  }, [serverSettings])

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle("dark")
  }

  // Start a new chat
  const startNewChat = () => {
    const newConversation: Conversation = {
      id: generateId(),
      title: "New Conversation",
      messages: [],
      model: currentConversation.model, // Keep the same model
      timestamp: Date.now(),
    }

    setCurrentConversation(newConversation)
    setConversations((prev) => [newConversation, ...prev])
    setInput("")
    setIsMobileMenuOpen(false)
    setIsSidebarOpen(false)
  }

  // Switch to a different conversation
  const switchConversation = (id: string) => {
    const conversation = conversations.find((c) => c.id === id)
    if (conversation) {
      setCurrentConversation(conversation)
      setIsSidebarOpen(false)
    }
  }

  // Update conversation title based on first message
  const updateConversationTitle = (messages: Message[]) => {
    if (messages.length === 2 && currentConversation.title === "New Conversation") {
      // Use the first user message as the title (truncated)
      const userMessage = messages[0].content
      const title = userMessage.length > 30 ? userMessage.substring(0, 30) + "..." : userMessage

      const updatedConversation = {
        ...currentConversation,
        title,
      }

      setCurrentConversation(updatedConversation)

      // Update in the conversations array
      setConversations((prev) => prev.map((c) => (c.id === currentConversation.id ? updatedConversation : c)))
    }
  }

  // Save settings
  const saveSettings = () => {
    setServerSettings(tempSettings)
    setIsSettingsOpen(false)
    // Reload models with new settings
    fetchModels()
  }

  // Fetch available models
  const fetchModels = () => {
    const { host, port } = serverSettings
    fetch(`http://${host}:${port}/v1/models`)
      .then((response) => response.json())
      .then((data) => {
        const modelIds = data.data.map((item: any) => item.id)
        setModels(modelIds)
      })
      .catch((error) => console.error("Error fetching models:", error))
  }

  // Fetch models on component mount and when server settings change
  useEffect(() => {
    fetchModels()
  }, [serverSettings])

  // Scroll to bottom of messages when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [currentConversation.messages])

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!input.trim() || !currentConversation.model) return

    const userMessage = input
    const newMessages = [...currentConversation.messages, { role: "user", content: userMessage }]

    // Update current conversation
    const updatedConversation = {
      ...currentConversation,
      messages: newMessages,
      timestamp: Date.now(),
    }

    setCurrentConversation(updatedConversation)

    // Update in conversations array
    setConversations((prev) => prev.map((c) => (c.id === currentConversation.id ? updatedConversation : c)))

    setInput("")
    setIsLoading(true)

    try {
      const { host, port } = serverSettings
      const response = await fetch(`http://${host}:${port}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: currentConversation.model,
          messages: [{ role: "user", content: userMessage }],
        }),
      })

      const data = await response.json()
      const aiResponse = data?.choices?.[0]?.message?.content || "No response from AI"

      const finalMessages = [...newMessages, { role: "assistant", content: aiResponse }]

      // Update current conversation with AI response
      const finalConversation = {
        ...currentConversation,
        messages: finalMessages,
        timestamp: Date.now(),
      }

      setCurrentConversation(finalConversation)

      // Update in conversations array
      setConversations((prev) => prev.map((c) => (c.id === currentConversation.id ? finalConversation : c)))

      // Update title if this is the first message exchange
      updateConversationTitle(finalMessages)
    } catch (error) {
      console.error("Error:", error)

      const errorMessages = [
        ...newMessages,
        { role: "assistant", content: "Sorry, there was an error processing your request." },
      ]

      // Update with error message
      const errorConversation = {
        ...currentConversation,
        messages: errorMessages,
        timestamp: Date.now(),
      }

      setCurrentConversation(errorConversation)

      // Update in conversations array
      setConversations((prev) => prev.map((c) => (c.id === currentConversation.id ? errorConversation : c)))
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

  const handleModelChange = (model: string) => {
    const updatedConversation = {
      ...currentConversation,
      model,
    }

    setCurrentConversation(updatedConversation)

    // Update in conversations array
    setConversations((prev) => prev.map((c) => (c.id === currentConversation.id ? updatedConversation : c)))
  }

  // Simple function to format code blocks in markdown
  const formatCodeBlock = (content: string) => {
    // Replace markdown code blocks with styled divs
    return content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
      return `<pre class="code-block ${language || ""}"><code>${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`
    })
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 dark:bg-gray-900">
      {/* Sidebar for chat history */}
      <div
        className={`fixed inset-0 z-20 transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isSidebarOpen ? "md:block" : "md:hidden"
        } w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-bold text-lg text-gray-900 dark:text-white">Conversations</h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        <div className="p-4">
          <button
            onClick={startNewChat}
            className="flex items-center gap-2 w-full p-2 mb-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-5 w-5" />
            <span>New Chat</span>
          </button>

          <div className="space-y-1 max-h-[calc(100vh-180px)] overflow-y-auto">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => switchConversation(conversation.id)}
                className={`flex items-center gap-2 w-full p-2 rounded-md text-left ${
                  currentConversation.id === conversation.id
                    ? "bg-gray-200 dark:bg-gray-700"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0 text-gray-700 dark:text-gray-300" />
                <span className="truncate text-gray-900 dark:text-white">{conversation.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              {/* Sidebar toggle for mobile */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <MessageSquare className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </button>

              <Bot className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h1 className="font-bold text-xl text-gray-900 dark:text-white">AI Chat Interface</h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Menu className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </button>

              {/* Desktop controls */}
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  aria-label="Settings"
                >
                  <Settings className="h-5 w-5" />
                </button>

                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  aria-label="Toggle dark mode"
                >
                  {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>

                <button
                  onClick={startNewChat}
                  className="flex items-center gap-1 px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Chat</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 space-y-2">
              <button
                onClick={() => {
                  setIsSettingsOpen(true)
                  setIsMobileMenuOpen(false)
                }}
                className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </button>

              <button
                onClick={toggleDarkMode}
                className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
              </button>

              <button
                onClick={startNewChat}
                className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <Plus className="h-5 w-5" />
                <span>New Chat</span>
              </button>
            </div>
          )}

          {/* Model selector */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <select
              value={currentConversation.model}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select a model</option>
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-3xl mx-auto space-y-4">
            {currentConversation.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 mt-20">
                <Bot className="h-12 w-12 mb-4" />
                <p className="text-lg">Select a model and start chatting</p>
                <p className="text-sm mt-2">Your messages will appear here</p>
              </div>
            ) : (
              currentConversation.messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`flex items-start gap-2 max-w-[85%] ${
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 rounded-full p-2 ${
                        message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    >
                      {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div
                      className={`p-3 rounded-lg ${
                        message.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {message.role === "user" ? (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      ) : (
                        <div className="markdown-content">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start gap-2 max-w-[85%]">
                  <div className="flex-shrink-0 rounded-full p-2 bg-gray-200 dark:bg-gray-700">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="p-3 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Thinking...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isLoading || !currentConversation.model}
              className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !currentConversation.model}
              className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              <span className="sr-only">Send</span>
            </button>
          </form>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">Settings</h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Server Host</label>
                <input
                  type="text"
                  value={tempSettings.host}
                  onChange={(e) => setTempSettings({ ...tempSettings, host: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Server Port</label>
                <input
                  type="text"
                  value={tempSettings.port}
                  onChange={(e) => setTempSettings({ ...tempSettings, port: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 mr-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
              >
                <Save className="h-4 w-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

