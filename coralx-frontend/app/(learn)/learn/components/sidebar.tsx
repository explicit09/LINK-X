"use client"

import { useEffect, useState } from "react"

interface Chapter {
  chapterTitle: string
  metadata: string[]
}

export default function Sidebar() {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])

  // useEffect(() => {
  //   async function fetchChapters() {
  //     try {
  //       const res = await fetch("/api/chapters") // update as needed
  //       const data = await res.json()
  //       setChapters(data.chapters || [])
  //     } catch (err) {
  //       console.error("Failed to load chapters:", err)
  //     }
  //   }

  //   fetchChapters()
  // }, [])

  useEffect(() => {
    async function fetchChapters() {
      try {
        // Dummy JSON structure (mimics expected API response)
        const dummyData = {
          chapters: [
            {
              chapterTitle: "Fundamentals",
              metadata: [
                "Introduction to Cryptocurrency",
                "Blockchain Technology",
                "Types of Cryptocurrencies",
              ],
            },
            {
              chapterTitle: "Practical Knowledge",
              metadata: [
                "Crypto Wallets and Security",
                "Buying and Selling Crypto",
                "Crypto Mining",
              ],
            },
            {
              chapterTitle: "Advanced Topics",
              metadata: [
                "DeFi and Smart Contracts",
                "Crypto Regulations",
                "Crypto Investment Strategies",
                "Future of Cryptocurrency",
              ],
            },
            {
              chapterTitle: "Assessment",
              metadata: ["Skills Check"],
            },
          ],
        }
  
        // Simulate delay to mimic fetch
        await new Promise((res) => setTimeout(res, 500))
  
        console.log("Loaded dummy chapters:", dummyData)
        setChapters(dummyData.chapters)
      } catch (err) {
        console.error("Failed to load chapters:", err)
      }
    }
  
    fetchChapters()
  }, [])

  const handleChatClick = async (message: string) => {
    if (!message.trim()) return
  
    console.log("Sending message to AI:", message)
  
    try {
      const response = await fetch("http://localhost:8080/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ message }),
      })
  
      const data = await response.json()
      console.log("Raw AI response:", data)
  
      if (data.error) {
        console.error("Chatbot error:", data.error)
        return
      }
  
      if (data.response) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: message },
          { role: "assistant", content: data.response },
        ])
        console.log("Assistant replied:", data.response)
      }
    } catch (err) {
      console.error("Failed to send message:", err)
    }
  }
  
  

  // const handleChatClick = async (message: string) => {
  //   if (!message.trim()) return

  //   try {
  //     const response = await fetch("http://localhost:8080/chat", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       credentials: "include",
  //       body: JSON.stringify({ message }),
  //     })

  //     const data = await response.json()

  //     if (data.error) {
  //       console.error("Chatbot error:", data.error)
  //       return
  //     }

  //     if (data.response) {
  //       setMessages((prev) => [
  //         ...prev,
  //         { role: "user", content: message },
  //         { role: "assistant", content: data.response },
  //       ])
  //       console.log("AI Response:", data.response)
  //     }
  //   } catch (err) {
  //     console.error("Failed to send message:", err)
  //   }
  // }

  return (
    <nav className="w-64 bg-gray-900 text-gray-300 p-4 overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-400">CryptoEdu</h2>
      {chapters.map((chapter, index) => (
        <div key={index} className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-gray-400">{chapter.chapterTitle}</h3>
          <ul>
            {chapter.metadata.map((item, itemIndex) => (
              <li key={itemIndex} className="mb-2">
                <button
                  onClick={() => handleChatClick(item)}
                  className="w-full text-left block py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors duration-200"
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
