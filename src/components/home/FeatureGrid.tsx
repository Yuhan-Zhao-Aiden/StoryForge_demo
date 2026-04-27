'use client'

import { useRef, useEffect, useCallback } from 'react'
import { Sparkles, Network, Users, GitBranch, Share2, Download } from 'lucide-react'

/** One accent colour per feature card: Purple, Blue, Pink, Green, Red, Dark Blue */
const ACCENT = [
  { r: 168, g: 85,  b: 247 }, // Purple    — AI Writing
  { r: 59,  g: 130, b: 246 }, // Blue      — Node-Based Mapping
  { r: 236, g: 72,  b: 153 }, // Pink      — Real-time Collab
  { r: 34,  g: 197, b: 94  }, // Green     — Advanced Versioning
  { r: 239, g: 68,  b: 68  }, // Red       — Publish & Share
  { r: 29,  g: 78,  b: 216 }, // Dark Blue — Multi-Format Export
]

const features = [
  {
    Icon: Sparkles,
    title: 'AI Writing',
    description:
      "Intelligent suggestions to overcome writer's block, generate dialogue, and expand branching storylines effortlessly.",
  },
  {
    Icon: Network,
    title: 'Node-Based Mapping',
    description:
      'Visualize complex narratives. Drag, drop, and connect plot points, character arcs, and world-building elements.',
  },
  {
    Icon: Users,
    title: 'Real-time Collab',
    description:
      'Work synchronously with co-writers, editors, and beta readers on the same cinematic canvas.',
  },
  {
    Icon: GitBranch,
    title: 'Advanced Versioning',
    description:
      'Never lose an idea. Track changes, branch off experimental scenes, and merge the best outcomes seamlessly.',
  },
  {
    Icon: Share2,
    title: 'Publish & Share',
    description:
      'Seamlessly share interactive story webs or publish completed narratives directly to the community.',
  },
  {
    Icon: Download,
    title: 'Multi-Format Export',
    description:
      'Export your story as PDF, ePub, or structured JSON for game engines and interactive media.',
  },
]

export default function FeatureGrid() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const glowRefs = useRef<(HTMLDivElement | null)[]>([])
  const rafRef = useRef<number | null>(null)

  /* ── Scroll reveal ─────────────────────────────────────────────────── */
  useEffect(() => {
    const cards = cardRefs.current.filter((c): c is HTMLDivElement => c !== null)
    if (cards.length === 0) return

    // Set initial hidden state before first paint via layout measurement
    cards.forEach((card) => {
      card.style.opacity = '0'
      card.style.transform = 'translateY(24px)'
      card.style.transition = 'opacity 0.55s ease, transform 0.55s ease'
    })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const idx = cards.indexOf(entry.target as HTMLDivElement)
          setTimeout(() => {
            const card = entry.target as HTMLDivElement
            card.style.opacity = '1'
            card.style.transform = 'translateY(0)'
          }, idx * 80)
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.1, rootMargin: '-40px 0px' }
    )

    cards.forEach((card) => observer.observe(card))
    return () => observer.disconnect()
  }, [])

  /* ── Cursor-following glow ─────────────────────────────────────────── */
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      glowRefs.current.forEach((glow, i) => {
        const card = cardRefs.current[i]
        if (!glow || !card) return
        const rect = card.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const inside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height
        const ac = ACCENT[i] ?? ACCENT[0]
        const { r, g, b } = ac
        if (inside) {
          glow.style.background = `radial-gradient(300px circle at ${x}px ${y}px, rgba(${r},${g},${b},0.2), transparent 70%)`
          glow.style.opacity = '1'
          card.style.borderColor = `rgba(${r},${g},${b},0.35)`
          card.style.boxShadow = `0 8px 32px rgba(${r},${g},${b},0.12)`
        } else {
          glow.style.opacity = '0'
          card.style.borderColor = 'rgba(255,255,255,0.06)'
          card.style.boxShadow = ''
        }
      })
    })
  }, [])

  const onMouseLeave = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    glowRefs.current.forEach((glow) => {
      if (glow) glow.style.opacity = '0'
    })
    cardRefs.current.forEach((card) => {
      if (!card) return
      card.style.borderColor = 'rgba(255,255,255,0.06)'
      card.style.boxShadow = ''
    })
  }, [])

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    el.addEventListener('mousemove', onMouseMove)
    el.addEventListener('mouseleave', onMouseLeave)
    return () => {
      el.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('mouseleave', onMouseLeave)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [onMouseMove, onMouseLeave])

  return (
    <div ref={sectionRef} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {features.map(({ Icon, title, description }, i) => {
        const { r, g, b } = ACCENT[i] ?? ACCENT[0]
        return (
          <div
            key={title}
            ref={(el) => { cardRefs.current[i] = el }}
            className="relative rounded-xl border bg-[#1c1b1d] p-6 hover:bg-[#201f22] transition-all duration-300"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            {/* Cursor-following radial glow overlay */}
            <div
              ref={(el) => { glowRefs.current[i] = el }}
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{ opacity: 0, transition: 'opacity 0.25s ease' }}
              aria-hidden="true"
            />

            {/* Icon — uses card-specific accent colour */}
            <div
              className="relative mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-200"
              style={{
                backgroundColor: `rgba(${r},${g},${b},0.12)`,
                color: `rgb(${r},${g},${b})`,
              }}
            >
              <Icon className="h-5 w-5" />
            </div>

            <h3 className="relative mb-2 font-semibold text-[#e5e1e4] font-(family-name:--font-space-grotesk)">
              {title}
            </h3>
            <p className="relative text-sm text-[#cfc2d6] leading-relaxed">{description}</p>
          </div>
        )
      })}
    </div>
  )
}
