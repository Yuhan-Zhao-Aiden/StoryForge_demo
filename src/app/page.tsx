import Link from 'next/link'
import { Button } from '@/components/ui/button'
import HeroSection from '@/components/home/HeroSection'
import FeatureGrid from '@/components/home/FeatureGrid'



export default function Home() {
  return (
    <div className="min-h-screen bg-[#131315] text-[#e5e1e4]">

      {/* ── Navigation ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/6 bg-[#131315]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex h-16 items-center justify-between gap-8">
          <span className="text-xl font-bold tracking-tight font-(family-name:--font-space-grotesk) bg-linear-to-r from-[#A855F7] via-[#ddb7ff] to-[#A855F7] bg-clip-text text-transparent select-none">
            StoryForge
          </span>

          <nav className="hidden md:flex items-center gap-7 text-sm text-[#cfc2d6]">
            <Link href="#features" className="hover:text-[#ddb7ff] transition-colors duration-200">
              Features
            </Link>
            <Link href="#showcase" className="hover:text-[#ddb7ff] transition-colors duration-200">
              Showcase
            </Link>
            <Link href="#" className="hover:text-[#ddb7ff] transition-colors duration-200">
              Pricing
            </Link>
            <Link href="#" className="hover:text-[#ddb7ff] transition-colors duration-200">
              Docs
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              asChild
              className="hidden sm:inline-flex text-[#cfc2d6] hover:text-white hover:bg-white/5"
            >
              <Link href="/login">Log In</Link>
            </Button>
            <Button
              asChild
              className="bg-[#A855F7] hover:bg-[#9333ea] text-white font-semibold shadow-[0_0_20px_rgba(168,85,247,0.25)] hover:shadow-[0_0_30px_rgba(168,85,247,0.45)] transition-all duration-200"
            >
              <Link href="/create-account">Start Writing</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <HeroSection />

      {/* ── Features ───────────────────────────────────────── */}
      <section id="features" className="border-t border-white/6 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl lg:text-4xl font-bold font-(family-name:--font-space-grotesk)">
              Everything You Need to{' '}
              <span className="bg-linear-to-r from-[#A855F7] to-[#3B82F6] bg-clip-text text-transparent">
                Create Worlds
              </span>
            </h2>
            <p className="text-[#cfc2d6] max-w-xl mx-auto text-base leading-relaxed">
              A complete creative toolkit for storytellers, worldbuilders, and
              collaborative writers.
            </p>
          </div>

          <FeatureGrid />
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-white/6 py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <p className="text-sm font-bold font-(family-name:--font-space-grotesk) bg-linear-to-r from-[#A855F7] to-[#ddb7ff] bg-clip-text text-transparent">
              StoryForge
            </p>
            <p className="text-xs text-[#988d9f]">
              The cinematic engine for digital creators.
            </p>
          </div>

          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-[#988d9f]">
            {['Features', 'Showcase', 'Pricing', 'Docs', 'Twitter', 'Discord', 'Terms', 'Privacy'].map(
              (item) => (
                <Link
                  key={item}
                  href={item === 'Features' ? '#features' : item === 'Showcase' ? '#showcase' : '#'}
                  className="hover:text-[#cfc2d6] transition-colors duration-200"
                >
                  {item}
                </Link>
              )
            )}
          </nav>

          <p className="text-xs text-[#988d9f]">© 2024 StoryForge.</p>
        </div>
      </footer>
    </div>
  )
}
