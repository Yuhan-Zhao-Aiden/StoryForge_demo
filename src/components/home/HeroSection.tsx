'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'

interface Card {
  src: string
  alt: string
  title: string
  excerpt: string
  rotate: number
  depth: number
  corner: 'tl' | 'tr' | 'bl' | 'br'
}

const CARDS: Card[] = [
  {
    src: '/images/hero-cyberpunk-city.jpg',
    alt: 'Cyberpunk city at night with neon lights and rain',
    title: 'Neon Drift',
    excerpt: 'The rain never stopped in sector 4. It washed away the grime but never the memories...',
    rotate: -13,
    depth: 0.8,
    corner: 'tl',
  },
  {
    src: '/images/hero-ethereal-forest.jpg',
    alt: 'Ethereal mystical forest with glowing crystals and ancient archway',
    title: 'Verdant Gate',
    excerpt: 'Ancient roots pulsed with luminescent sap, guiding the lost traveler deeper into the woods...',
    rotate: 11,
    depth: 1.3,
    corner: 'tr',
  },
  {
    src: '/images/hero-steampunk-island.jpg',
    alt: 'Steampunk flying city above a sea of clouds with airships',
    title: 'Aetherville',
    excerpt: 'Gears ground and steam hissed as the floating city adjusted its altitude against the storm...',
    rotate: 10,
    depth: 1.1,
    corner: 'bl',
  },
  {
    src: '/images/hero-obsidian-castle.jpg',
    alt: 'Dark gothic castle on a jagged mountain peak with red lightning',
    title: 'Dreadspire',
    excerpt: 'Lightning silhouetted the jagged towers. Whatever slumbered within was finally waking up...',
    rotate: 14,
    depth: 0.6,
    corner: 'br',
  },
]

/** Max parallax displacement in px at the extreme cursor position */
const MAX_PX = 48

/** Absolute corner positions — partially overflow the section edges for the Stitch look */
const CORNER_CLASS: Record<Card['corner'], string> = {
  tl: 'top-[10%] left-[1%] lg:left-[3%]',
  tr: 'top-[6%]  right-[1%] lg:right-[3%]',
  bl: 'bottom-[8%] left-[1%] lg:left-[3%]',
  br: 'bottom-[10%] right-[1%] lg:right-[3%]',
}

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const outerRefs = useRef<(HTMLDivElement | null)[]>([])
  const rafRef = useRef<number | null>(null)

  /** Apply base rotation on mount */
  useEffect(() => {
    CARDS.forEach((card, i) => {
      const el = outerRefs.current[i]
      if (el) el.style.transform = `rotate(${card.rotate}deg)`
    })
  }, [])

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!sectionRef.current) return
    const rect = sectionRef.current.getBoundingClientRect()
    // Normalized -0.5 → +0.5 from section center
    const nx = (e.clientX - rect.left) / rect.width - 0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      CARDS.forEach((card, i) => {
        const el = outerRefs.current[i]
        if (!el) return
        // Remove any spring-back transition so tracking is instant
        el.style.transition = ''
        const tx = nx * MAX_PX * card.depth
        const ty = ny * MAX_PX * card.depth
        el.style.transform = `translate(${tx}px, ${ty}px) rotate(${card.rotate}deg)`
      })
    })
  }, [])

  const onMouseLeave = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    CARDS.forEach((card, i) => {
      const el = outerRefs.current[i]
      if (!el) return
      // Spring back to resting rotation
      el.style.transition = 'transform 0.85s cubic-bezier(0.34, 1.56, 0.64, 1)'
      el.style.transform = `rotate(${card.rotate}deg)`
      el.addEventListener(
        'transitionend',
        () => { el.style.transition = '' },
        { once: true },
      )
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
    <section
      ref={sectionRef}
      id="showcase"
      className="relative w-full overflow-hidden flex items-center justify-center min-h-[calc(100vh-4rem)]"
    >
      {/* Subtle radial ambient glow in the center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(168,85,247,0.07) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* ── Constraint wrapper — cards position relative to this, not the viewport ── */}
      <div className="relative w-full max-w-5xl mx-auto min-h-[calc(100vh-4rem)] flex items-center justify-center">

        {/* ── 4 Corner Cards ─────────────────────────────── */}
        {CARDS.map((card, i) => (
          <div
            key={card.title}
            ref={(el) => { outerRefs.current[i] = el }}
            className={`absolute ${CORNER_CLASS[card.corner]} w-47.5 sm:w-53.75 lg:w-63.75 opacity-30 sm:opacity-100 transition-opacity duration-300`}
            style={{ transform: `rotate(${card.rotate}deg)`, willChange: 'transform' }}
          >
            {/* Inner card — hover effects only (separate element from parallax) */}
            <div className="relative aspect-3/4 rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.75)] hover:border-[#A855F7]/45 hover:scale-[1.04] hover:shadow-[0_20px_60px_rgba(168,85,247,0.18)] transition-all duration-300 cursor-pointer">
              <Image
                src={card.src}
                alt={card.alt}
                fill
                sizes="255px"
                className="object-cover"
                priority
              />
              {/* Deep vignette so text is always legible */}
              <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-black/5" />
              {/* Text — always visible, white */}
              <div className="absolute bottom-0 inset-x-0 p-3.5">
                <p className="text-[11px] font-bold text-white uppercase tracking-[0.13em] mb-1.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                  {card.title}
                </p>
                <p className="text-[9.5px] text-white/80 leading-relaxed line-clamp-3 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  {card.excerpt}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* ── Centered Copy ──────────────────────────────── */}
        <div className="relative z-10 text-center px-6 max-w-2xl mx-auto space-y-7 py-20">


          <h1 className="text-5xl lg:text-[3.5rem] xl:text-6xl font-bold leading-[1.1] tracking-tight font-(family-name:--font-space-grotesk)">
            Forge stories together,
            <br />
            <span className="bg-linear-to-r from-[#c198e7] to-[#e679af]  bg-clip-text text-transparent">
              one node at a time
            </span>
          </h1>

          <p className="text-lg text-[#cfc2d6] leading-relaxed max-w-lg mx-auto">
            Create branching stories with a powerful node-based editor
          </p>

          <div className="flex flex-wrap gap-3 justify-center pt-1">
            <Button
              asChild
              size="lg"
              className="bg-linear-to-r from-[#A855F7] to-[#EC4899] hover:from-[#9333ea] hover:to-[#db2777] text-white font-semibold px-8 shadow-[0_0_30px_rgba(168,85,247,0.25)] hover:shadow-[0_0_40px_rgba(168,85,247,0.45)] hover:-translate-y-px transition-all duration-200"
            >
              <Link href="/create-account">Begin Your Journey</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-[#4d4354] bg-transparent text-[#cfc2d6] hover:bg-white/5 hover:text-white hover:border-[#A855F7]/40 px-8 hover:-translate-y-px transition-all duration-200"
            >
              <Link href="/dashboard">Forge Your Story</Link>
            </Button>
          </div>
        </div>

      </div>
    </section>
  )
}
