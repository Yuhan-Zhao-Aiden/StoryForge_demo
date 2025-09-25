'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [currentStory, setCurrentStory] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  const stories = [
    "Once upon a time, in a digital realm...",
    "A writer discovered the power of AI...",
    "Stories came alive with every keystroke...",
    "The impossible became possible..."
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStory((prev) => (prev + 1) % stories.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Magical Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Story Elements */}
        <div className="absolute top-20 left-10 text-6xl opacity-20 animate-float">📚</div>
        <div className="absolute top-40 right-20 text-5xl opacity-30 animate-float animation-delay-1000">✨</div>
        <div className="absolute bottom-40 left-20 text-4xl opacity-25 animate-float animation-delay-2000">🪄</div>
        <div className="absolute bottom-20 right-10 text-5xl opacity-20 animate-float animation-delay-3000">🌟</div>
        
        {/* Animated Background Orbs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Magical Particles */}
      {mounted && [...Array(80)].map((_, i) => {
        const seed = i * 0.1;
        const left = (Math.sin(seed) * 0.5 + 0.5) * 100;
        const top = (Math.cos(seed * 1.3) * 0.5 + 0.5) * 100;
        const delay = (Math.sin(seed * 2.1) * 0.5 + 0.5) * 4;
        const duration = 4 + (Math.sin(seed * 3.7) * 0.5 + 0.5) * 6;
        const size = 1 + (Math.sin(seed * 4.2) * 0.5 + 0.5) * 2;

        return (
          <div
            key={i}
            className="absolute bg-white rounded-full opacity-40 animate-float"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${size}px`,
              height: `${size}px`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`
            }}
          />
        );
      })}

      {/* Navigation */}
      <nav className="relative z-20 p-6">
        <div className="max-w-7xl mx-auto flex justify-center">
          <div className="text-3xl font-bold text-white tracking-wider">
            <span className="bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
              StoryForge
            </span>
          </div>
        </div>
      </nav>

      {/* Main Story Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-6xl mx-auto">
          {/* Animated Story Text */}
          <div className="mb-8 h-16 flex items-center justify-center">
            <p className="text-2xl md:text-3xl text-yellow-200 font-light italic animate-fade-in-out">
              {stories[currentStory]}
            </p>
          </div>

          {/* Hero Title with Story Theme */}
          <h1 className="text-7xl md:text-9xl font-bold mb-8 leading-tight">
            <span className="bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent animate-gradient">
              StoryForge
            </span>
          </h1>
          
          {/* Magical Subtitle */}
          <p className="text-2xl md:text-3xl text-gray-200 mb-4 max-w-4xl mx-auto leading-relaxed font-light">
            Where <span className="text-yellow-300 font-semibold">imagination</span> meets <span className="text-pink-300 font-semibold">technology</span>
          </p>
          <p className="text-xl md:text-2xl text-gray-300 mb-16 max-w-4xl mx-auto leading-relaxed">
            Craft epic tales, weave magical narratives, and bring your stories to life with the power of AI
          </p>

          {/* Magical CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center mb-20">
            <Link 
              href="/create-account"
              className="group relative px-12 py-6 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white font-bold text-xl rounded-3xl transition-all duration-500 hover:scale-110 hover:shadow-2xl hover:shadow-purple-500/50 transform hover:-translate-y-2"
            >
              <span className="relative z-10 flex items-center gap-3">
                <span>✨</span>
                <span>Begin Your Story</span>
                <span>✨</span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 via-pink-600 to-purple-700 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </Link>
            
            <Link 
              href="/login"
              className="group px-12 py-6 border-3 border-yellow-300/50 text-yellow-200 font-bold text-xl rounded-3xl backdrop-blur-sm bg-white/10 hover:bg-yellow-300/20 transition-all duration-500 hover:scale-110 hover:border-yellow-300 transform hover:-translate-y-2"
            >
              <span className="flex items-center gap-3">
                <span>🔮</span>
                <span>Enter the Realm</span>
                <span>🔮</span>
              </span>
            </Link>
          </div>

          {/* Story Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            <div className="group bg-gradient-to-br from-yellow-400/20 to-orange-400/20 backdrop-blur-sm border border-yellow-300/30 rounded-3xl p-10 hover:bg-gradient-to-br hover:from-yellow-400/30 hover:to-orange-400/30 transition-all duration-500 hover:scale-110 hover:shadow-2xl hover:shadow-yellow-400/25">
              <div className="text-6xl mb-6 animate-bounce">📖</div>
              <h3 className="text-2xl font-bold text-yellow-200 mb-6">Epic Narratives</h3>
              <p className="text-gray-200 text-lg leading-relaxed">Create compelling stories that transport readers to magical worlds and unforgettable adventures</p>
            </div>
            
            <div className="group bg-gradient-to-br from-pink-400/20 to-purple-400/20 backdrop-blur-sm border border-pink-300/30 rounded-3xl p-10 hover:bg-gradient-to-br hover:from-pink-400/30 hover:to-purple-400/30 transition-all duration-500 hover:scale-110 hover:shadow-2xl hover:shadow-pink-400/25">
              <div className="text-6xl mb-6 animate-bounce animation-delay-1000">🪄</div>
              <h3 className="text-2xl font-bold text-pink-200 mb-6">AI Magic</h3>
              <p className="text-gray-200 text-lg leading-relaxed">Leverage cutting-edge AI to enhance your creativity and bring impossible ideas to life</p>
            </div>
            
            <div className="group bg-gradient-to-br from-purple-400/20 to-blue-400/20 backdrop-blur-sm border border-purple-300/30 rounded-3xl p-10 hover:bg-gradient-to-br hover:from-purple-400/30 hover:to-blue-400/30 transition-all duration-500 hover:scale-110 hover:shadow-2xl hover:shadow-purple-400/25">
              <div className="text-6xl mb-6 animate-bounce animation-delay-2000">🌟</div>
              <h3 className="text-2xl font-bold text-purple-200 mb-6">Infinite Possibilities</h3>
              <p className="text-gray-200 text-lg leading-relaxed">Explore endless story genres, characters, and worlds limited only by your imagination</p>
            </div>
          </div>

          {/* Story Preview Section */}
          <div className="mt-24 bg-gradient-to-r from-black/40 to-black/20 backdrop-blur-sm border border-white/20 rounded-3xl p-12 max-w-5xl mx-auto">
            <h2 className="text-4xl font-bold text-white mb-8 text-center">Your Story Awaits</h2>
            <div className="text-xl text-gray-200 text-center leading-relaxed italic">
              "In the realm of StoryForge, every word is a spell, every sentence a journey, and every story a universe waiting to be discovered. 
              <br /><br />
              <span className="text-yellow-300 font-semibold">What tale will you tell today?</span>"
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}