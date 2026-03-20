/**
 * Shared top-nav for public-facing pages (Rates, Air Freight, Ocean Freight).
 * LandingPage uses its own inline nav with anchor-scroll links.
 */
import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X, ArrowRight, ChevronDown } from 'lucide-react'

const IMG_PLANE = '/images/icon-plane.png'
const IMG_SHIP  = '/images/icon-ship.png'

export function SiteNav() {
  const [mobileOpen, setMobileOpen]     = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const servicesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) {
        setServicesOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const linkCls = 'relative px-4 py-2 group transition-colors hover:text-brand-navy'
  const underline = (
    <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-brand-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
  )

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-white shadow-md border-b-4 border-brand-gold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-28">

            {/* Logo */}
            <Link to="/" className="shrink-0 py-2">
              <img src="/logos/logo-cropped.png" alt="CargoLink Barbados" className="h-24 w-auto drop-shadow-sm" />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1 text-[14px] font-semibold text-gray-700 tracking-wide uppercase">
              <Link to="/" className={linkCls}>Home{underline}</Link>

              {/* Our Services dropdown */}
              <div ref={servicesRef} className="relative">
                <button
                  onClick={() => setServicesOpen(!servicesOpen)}
                  className="relative flex items-center gap-1 px-4 py-2 group transition-colors hover:text-brand-navy focus:outline-none"
                >
                  Our Services
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${servicesOpen ? 'rotate-180' : ''}`} />
                  {underline}
                </button>
                {servicesOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0 w-72 bg-brand-navy rounded-b-xl shadow-2xl overflow-hidden z-50 border-t-4 border-brand-gold">
                    <Link to="/air-freight" onClick={() => setServicesOpen(false)}
                      className="flex items-center gap-3 px-6 py-4 text-sm text-white hover:bg-white/10 transition-colors border-b border-white/10">
                      <img src={IMG_PLANE} className="w-6 h-6 object-contain invert" alt="" />
                      CargoLink Barbados Express Air Freight
                    </Link>
                    <Link to="/ocean-freight" onClick={() => setServicesOpen(false)}
                      className="flex items-center gap-3 px-6 py-4 text-sm text-white hover:bg-white/10 transition-colors">
                      <img src={IMG_SHIP} className="w-6 h-6 object-contain invert" alt="" />
                      CargoLink Barbados Ocean Freight
                    </Link>
                  </div>
                )}
              </div>

              <Link to="/rates" className={linkCls}>Rates{underline}</Link>
              <a href="/#contact" className={linkCls}>Contact Us{underline}</a>
            </nav>

            {/* Login / Sign Up */}
            <div className="hidden lg:flex items-center gap-3">
              <Link to="/login" className="px-4 py-2 text-sm font-semibold text-brand-navy hover:text-brand-navy-dark transition-colors uppercase tracking-wide">
                Login
              </Link>
              <Link to="/register" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-brand-navy rounded-lg hover:bg-brand-navy-dark transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 uppercase tracking-wide">
                Sign Up <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2.5 rounded-lg bg-brand-navy text-white hover:bg-brand-navy-dark transition-colors" aria-label="Menu">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-4 py-3 space-y-0.5">
            <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center justify-between py-3 text-sm font-semibold text-gray-800 hover:text-brand-navy border-b border-gray-100 uppercase tracking-wide">
              Home <ChevronDown className="w-4 h-4 -rotate-90" />
            </Link>
            <div className="border-b border-gray-100">
              <p className="py-3 text-sm font-semibold text-gray-800 uppercase tracking-wide">Our Services</p>
              <Link to="/air-freight"   onClick={() => setMobileOpen(false)} className="flex items-center gap-2 pl-4 pb-2.5 text-sm text-gray-600 hover:text-brand-navy">
                <img src={IMG_PLANE} className="w-5 h-5 object-contain" alt="" /> Express Air Freight
              </Link>
              <Link to="/ocean-freight" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 pl-4 pb-3 text-sm text-gray-600 hover:text-brand-navy">
                <img src={IMG_SHIP} className="w-5 h-5 object-contain" alt="" /> Ocean Freight
              </Link>
            </div>
            <Link to="/rates"   onClick={() => setMobileOpen(false)} className="flex items-center justify-between py-3 text-sm font-semibold text-gray-800 hover:text-brand-navy border-b border-gray-100 uppercase tracking-wide">
              Rates <ChevronDown className="w-4 h-4 -rotate-90" />
            </Link>
            <a href="/#contact" onClick={() => setMobileOpen(false)} className="flex items-center justify-between py-3 text-sm font-semibold text-gray-800 hover:text-brand-navy uppercase tracking-wide">
              Contact Us <ChevronDown className="w-4 h-4 -rotate-90" />
            </a>
          </div>
          <div className="flex gap-3 px-4 pb-4">
            <Link to="/login"    onClick={() => setMobileOpen(false)} className="flex-1 text-center py-3 text-sm font-bold text-brand-navy border-2 border-brand-navy rounded-lg uppercase tracking-wide hover:bg-brand-navy hover:text-white transition-colors">Login</Link>
            <Link to="/register" onClick={() => setMobileOpen(false)} className="flex-1 text-center py-3 text-sm font-bold text-white bg-brand-navy rounded-lg uppercase tracking-wide hover:bg-brand-navy-dark transition-colors">Sign Up</Link>
          </div>
        </div>
      )}
    </header>
  )
}
