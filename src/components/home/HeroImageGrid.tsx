'use client'

import Image from 'next/image'
import { useRef, useEffect, useCallback } from 'react'

const storyImages = [
  {
    src: '/images/hero-cyberpunk-city.jpg',
    alt: 'Cyberpunk city at night with neon lights and rain',
    title: 'Neon Drift',
    excerpt: 'The rain never stopped in sector 4. It washed away the grime but never the memories...',
  },
  {
    src: '/images/hero-ethereal-forest.jpg',
    alt: 'Ethereal mystical forest with glowing crystals and ancient archway',
    title: 'Verdant Gate',
    excerpt: 'Ancient roots pulsed with luminescent sap, guiding the lost traveler deeper into the woods...',
  },
  {
    src: '/images/hero-steampunk-island.jpg',
    alt: 'Steampunk flying city above a sea of clouds with airships',
    title: 'Aetherville',
    excerpt: 'Gears ground and steam hissed as the floating city adjusted its altitude against the storm...',
  },
  {
    src: '/images/hero-obsidian-castle.jpg',
    alt: 'Dark gothic castle on a jagged mountain peak with red lightning',
    title: 'Dreadspire',
    excerpt: 'Lightning silhouetted the jagged towers. Whatever slumbered within was finally waking up...',
  },
]

/** translateZ offset per card (top-left, top-right, bottom-left, bottom-right).
 *  Creates a split-depth feel — outer corners recede, inner corners protrude. */
const CARD_Z_PX = [-10, 6, 6, -10]

const MAX_TILT_DEG = 14

export default function HeroImageGrid() {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current || !innerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width  // 0–1
    const ny = (e.clientY - rect.top) / rect.height  // 0–1
    const rotX = (ny - 0.5) * -MAX_TILT_DEG
    const rotY = (nx - 0.5) * MAX_TILT_DEG
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      if (innerRef.current) {
        innerRef.current.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`
      }
    })
  }, [])

  const onMouseEnter = useCallback(() => {
    if (innerRef.current) {
      innerRef.current.style.transition = 'transform 0.1s ease-out'
    }
  }, [])

  const onMouseLeave = useCallback(() => {
    if (innerRef.current) {
      innerRef.current.style.transition = 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)'
      innerRef.current.style.transform = 'rotateX(0deg) rotateY(0deg)'
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('mousemove', onMouseMove)
    el.addEventListener('mouseenter', onMouseEnter)
    el.addEventListener('mouseleave', onMouseLeave)
    return () => {
      el.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('mouseenter', onMouseEnter)
      el.removeEventListener('mouseleave', onMouseLeave)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [onMouseMove, onMouseEnter, onMouseLeave])

  return (
    <div
      ref={containerRef}
      id="showcase"
      style={{ perspective: '900px' }}
    >
      <div
        ref={innerRef}
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
          willChange: 'transform',
        }}
        className="grid grid-cols-2 gap-3"
      >
        {storyImages.map((img, i) => (
          /* Depth wrapper — translateZ only, no hover styles here */
          <div key={img.title} style={{ transform: `translateZ(${CARD_Z_PX[i]}px)` }}>
            <div className="group relative aspect-4/3 rounded-xl overflow-hidden border border-white/6 shadow-[0_8px_32px_rgba(0,0,0,0.6)] hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300">
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 40vw, 22vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                priority
              />
              {/* Gradient vignette */}
              <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/15 to-transparent" />
              {/* Story label */}
              <div className="absolute bottom-0 inset-x-0 p-3 lg:p-4">
                <p className="text-[10px] lg:text-xs font-bold text-[#A855F7] uppercase tracking-[0.12em] mb-0.5">
                  {img.title}
                </p>
                <p className="text-[10px] lg:text-xs text-white/60 leading-relaxed line-clamp-2 translate-y-1 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  {img.excerpt}
                </p>
              </div>
              {/* Hover ring glow */}
              <div className="absolute inset-0 rounded-xl ring-0 group-hover:ring-1 group-hover:ring-[#A855F7]/40 transition-all duration-300 pointer-events-none" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
