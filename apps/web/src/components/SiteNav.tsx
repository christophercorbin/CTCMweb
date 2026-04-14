/**
 * Shared top-nav for all public-facing pages.
 * Auth-aware: shows Login/Sign Up when logged out, profile avatar + dropdown when logged in.
 */
import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, ArrowRight, ChevronDown, LayoutDashboard, User, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'

const IMG_PLANE = '/images/icon-plane.png'
const IMG_SHIP  = '/images/icon-ship.png'

function getInitials(firstName?: string, lastName?: string, email?: string): string {
  if (firstName && lastName) return (firstName[0] + lastName[0]).toUpperCase()
  if (firstName) return firstName.slice(0, 2).toUpperCase()
  const local = (email ?? '').split('@')[0]
  const parts  = local.split(/[._\-+]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

export function SiteNav() {
  const { isAuthenticated, user, signOut } = useAuth()
  const navigate = useNavigate()

  const [mobileOpen,  setMobileOpen]  = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [profileOpen,  setProfileOpen]  = useState(false)

  const servicesRef = useRef<HTMLDivElement>(null)
  const profileRef  = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) setServicesOpen(false)
      if (profileRef.current  && !profileRef.current.contains(e.target as Node))  setProfileOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSignOut = async () => {
    setProfileOpen(false)
    setMobileOpen(false)
    await signOut()
    navigate('/')
  }

  const dashboardPath = user?.role === 'admin' ? '/admin/dashboard' : '/dashboard'
  const initials      = user ? getInitials(user.firstName, user.lastName, user.email) : ''
  const displayName   = user?.firstName || user?.email?.split('@')[0] || 'Account'

  const linkCls = 'relative px-4 py-2 group transition-colors hover:text-brand-navy'
  const underline = <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-brand-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-white shadow-md border-b-4 border-brand-gold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-28">

            {/* Logo → always back to landing page */}
            <Link to="/" className="shrink-0 py-2">
              <img src="/logos/logo-cropped.png" alt="CargoLink Barbados" className="h-24 w-auto drop-shadow-sm" />
            </Link>

            {/* Desktop nav links */}
            <nav className="hidden lg:flex items-center gap-1 text-[14px] font-semibold text-gray-700 tracking-wide uppercase">
              <Link
                to="/"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={linkCls}
              >Home{underline}</Link>

              {/* Our Services dropdown */}
              <div ref={servicesRef} className="relative">
                <button
                  onClick={() => setServicesOpen(!servicesOpen)}
                  className="relative flex items-center gap-1 px-4 py-2 group transition-colors hover:text-brand-navy focus:outline-none uppercase tracking-wide"
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

              <Link to="/rates"    className={linkCls}>Rates{underline}</Link>
              <a    href="/#contact" className={linkCls}>Contact Us{underline}</a>
            </nav>

            {/* Right: auth-aware */}
            <div className="hidden lg:flex items-center gap-3">
              {isAuthenticated && user ? (
                /* ── LOGGED IN: profile avatar + dropdown ── */
                <div ref={profileRef} className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-brand-navy flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {initials}
                    </div>
                    <span className="text-sm font-semibold text-gray-700 max-w-[120px] truncate">{displayName}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                      {/* User info header */}
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Signed in as</p>
                        <p className="text-sm font-semibold text-gray-800 truncate">{user.email}</p>
                      </div>
                      <Link to={dashboardPath} onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <LayoutDashboard className="w-4 h-4 text-brand-navy" /> Dashboard
                      </Link>
                      <Link to="/customer-info" onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100">
                        <User className="w-4 h-4 text-brand-navy" /> My Account
                      </Link>
                      <button onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100">
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* ── LOGGED OUT: Login + Sign Up ── */
                <>
                  <Link to="/login" className="px-4 py-2 text-sm font-semibold text-brand-navy hover:text-brand-navy-dark transition-colors uppercase tracking-wide">
                    Login
                  </Link>
                  <Link to="/register" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-brand-navy rounded-lg hover:bg-brand-navy-dark transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 uppercase tracking-wide">
                    Sign Up <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2.5 rounded-lg bg-brand-navy text-white hover:bg-brand-navy-dark transition-colors" aria-label="Menu">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-4 py-3 space-y-0.5">
            <Link
              to="/"
              onClick={() => { setMobileOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className="flex items-center justify-between py-3 text-sm font-semibold text-gray-800 hover:text-brand-navy border-b border-gray-100 uppercase tracking-wide">
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
            <Link to="/rates" onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between py-3 text-sm font-semibold text-gray-800 hover:text-brand-navy border-b border-gray-100 uppercase tracking-wide">
              Rates <ChevronDown className="w-4 h-4 -rotate-90" />
            </Link>
            <a href="/#contact" onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between py-3 text-sm font-semibold text-gray-800 hover:text-brand-navy uppercase tracking-wide">
              Contact Us <ChevronDown className="w-4 h-4 -rotate-90" />
            </a>
          </div>

          {/* Mobile auth section */}
          {isAuthenticated && user ? (
            <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-2">
              <div className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-brand-navy flex items-center justify-center text-white font-bold text-sm shrink-0">{initials}</div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Signed in as</p>
                  <p className="text-sm font-semibold text-gray-800 truncate max-w-[180px]">{user.email}</p>
                </div>
              </div>
              <Link to={dashboardPath} onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 w-full py-3 text-sm font-bold text-brand-navy border-2 border-brand-navy rounded-lg justify-center uppercase tracking-wide hover:bg-brand-navy hover:text-white transition-colors">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
              <button onClick={handleSignOut}
                className="w-full py-3 text-sm font-bold text-red-600 border-2 border-red-200 rounded-lg uppercase tracking-wide hover:bg-red-50 transition-colors">
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex gap-3 px-4 pb-4">
              <Link to="/login"    onClick={() => setMobileOpen(false)} className="flex-1 text-center py-3 text-sm font-bold text-brand-navy border-2 border-brand-navy rounded-lg uppercase tracking-wide hover:bg-brand-navy hover:text-white transition-colors">Login</Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="flex-1 text-center py-3 text-sm font-bold text-white bg-brand-navy rounded-lg uppercase tracking-wide hover:bg-brand-navy-dark transition-colors">Sign Up</Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
