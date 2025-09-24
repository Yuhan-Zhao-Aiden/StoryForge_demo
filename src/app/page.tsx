'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function HomePage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden relative">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Particles */}
      <div className="absolute inset-0">
        {mounted && [...Array(50)].map((_, i) => {
          const seed = i * 0.1;
          const left = (Math.sin(seed) * 0.5 + 0.5) * 100;
          const top = (Math.cos(seed * 1.3) * 0.5 + 0.5) * 100;
          const delay = (Math.sin(seed * 2.1) * 0.5 + 0.5) * 3;
          const duration = 3 + (Math.sin(seed * 3.7) * 0.5 + 0.5) * 4;
          
          return (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-30 animate-float"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`
              }}
            />
          );
        })}
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="flex justify-center items-center p-6 lg:px-12">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">📖</span>
            </div>
            <span className="text-2xl font-bold text-white">StoryForge</span>
          </div>
        </nav>

        {/* Main content */}
        <div className="text-center px-6 lg:px-12 py-20">
          <div className={`max-w-6xl mx-auto transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="mb-8">
              <h1 className="text-6xl lg:text-8xl font-bold text-white mb-6 leading-tight">
                Where Stories
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent block">
                  Come Alive
                </span>
              </h1>
              <p className="text-xl lg:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
                Collaborate with writers worldwide, create immersive stories, and bring your imagination to life with our revolutionary storytelling platform.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-20">
              <Link 
                href="/create-account"
                className="group bg-gradient-to-r from-purple-500 to-pink-500 text-white px-10 py-5 rounded-2xl font-bold text-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-purple-500/25"
              >
                <span className="flex items-center justify-center">
                  Start Writing Free
                  <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>
              <Link 
                href="/login"
                className="bg-white/10 backdrop-blur-sm text-white px-10 py-5 rounded-2xl font-bold text-xl border-2 border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-300 transform hover:scale-105"
              >
                Sign In
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-20">
              <div className="group bg-white/10 backdrop-blur-sm p-8 rounded-3xl border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">✍️</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Real-time Collaboration</h3>
                <p className="text-gray-300 text-lg">Write together seamlessly with live editing, comments, and version control.</p>
              </div>

              <div className="group bg-white/10 backdrop-blur-sm p-8 rounded-3xl border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">🌍</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Global Community</h3>
                <p className="text-gray-300 text-lg">Connect with writers from every corner of the world and share your stories.</p>
              </div>

              <div className="group bg-white/10 backdrop-blur-sm p-8 rounded-3xl border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">🚀</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Instant Publishing</h3>
                <p className="text-gray-300 text-lg">Publish your stories instantly and reach millions of readers worldwide.</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-12 border border-white/20">
              <div className="grid md:grid-cols-4 gap-8 text-center">
                <div className="group">
                  <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">50K+</div>
                  <div className="text-gray-300 text-lg">Active Writers</div>
                </div>
                <div className="group">
                  <div className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">200K+</div>
                  <div className="text-gray-300 text-lg">Stories Created</div>
                </div>
                <div className="group">
                  <div className="text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">5M+</div>
                  <div className="text-gray-300 text-lg">Readers Worldwide</div>
                </div>
                <div className="group">
                  <div className="text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">98%</div>
                  <div className="text-gray-300 text-lg">Satisfaction Rate</div>
                </div>
              </div>
            </div>

            <div className="mt-20 bg-white/5 backdrop-blur-sm rounded-3xl p-12 border border-white/10">
              <div className="max-w-4xl mx-auto text-center">
                <div className="text-6xl mb-6">💬</div>
                <blockquote className="text-2xl lg:text-3xl text-white mb-8 italic">
                  "StoryForge transformed how I write. The collaborative features and global community opened up possibilities I never imagined."
                </blockquote>
                <div className="flex items-center justify-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-2xl">👩‍💻</span>
                  </div>
                  <div className="text-left">
                    <div className="text-white font-bold text-xl">Sarah Chen</div>
                    <div className="text-gray-400">Bestselling Author</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="text-center py-12 border-t border-white/10">
          <div className="text-gray-400">
            <p>&copy; 2024 StoryForge. Crafting the future of storytelling.</p>
          </div>
        </footer>
      </div>
    </div>
  )
}