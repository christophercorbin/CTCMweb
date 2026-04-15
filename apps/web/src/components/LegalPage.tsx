import type { ReactNode } from 'react'
import { SiteNav } from './SiteNav'
import { SiteFooter } from './SiteFooter'

interface LegalPageProps {
  eyebrow: string
  title: string
  lastUpdated: string
  children: ReactNode
}

/**
 * Shared layout for public legal pages (Privacy Policy, Terms & Conditions).
 * Provides the standard brand hero + prose-styled content area + footer.
 */
export function LegalPage({ eyebrow, title, lastUpdated, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <SiteNav />

      {/* Hero */}
      <section className="relative min-h-[280px] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src="/images/hero-bg.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-brand-navy/75" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <p className="text-brand-gold font-semibold text-sm uppercase tracking-widest mb-3">{eyebrow}</p>
          <h1 className="text-4xl sm:text-[44px] font-bold text-white leading-tight mb-3">{title}</h1>
          <p className="text-white/80 text-sm">Last updated: {lastUpdated}</p>
        </div>
      </section>

      {/* Body */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <article className="legal-prose text-gray-700 leading-relaxed space-y-5">
            {children}
          </article>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Reusable typography primitives so individual legal pages read
   like prose without having to repeat Tailwind classes.
   ───────────────────────────────────────────────────────────── */

export const H2 = ({ children, id }: { children: ReactNode; id?: string }) => (
  <h2 id={id} className="text-2xl font-bold text-brand-navy mt-10 mb-3 scroll-mt-24">{children}</h2>
)

export const H3 = ({ children }: { children: ReactNode }) => (
  <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">{children}</h3>
)

export const P = ({ children }: { children: ReactNode }) => (
  <p className="text-base">{children}</p>
)

export const UL = ({ children }: { children: ReactNode }) => (
  <ul className="list-disc pl-6 space-y-2 text-base">{children}</ul>
)

export const Term = ({ label, children }: { label: string; children: ReactNode }) => (
  <p className="text-base">
    <strong className="text-gray-900">{label}</strong>{' '}{children}
  </p>
)
