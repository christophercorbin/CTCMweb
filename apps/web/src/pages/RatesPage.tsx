import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  MapPin, Phone, Mail, CheckCircle,
  Facebook, Instagram, Twitter, Linkedin,
  Menu, X, ArrowRight, ChevronDown,
} from 'lucide-react'

const RATES: { weight: string; usd: number; bbd: number }[] = [
  { weight: '1',        usd: 8.45, bbd: 17.33 },
  { weight: '2',        usd: 7.31, bbd: 14.82 },
  { weight: '3',        usd: 7.07, bbd: 14.35 },
  { weight: '4',        usd: 6.01, bbd: 12.81 },
  { weight: '5',        usd: 5.80, bbd: 11.76 },
  { weight: '6-11',     usd: 5.58, bbd: 11.31 },
  { weight: '12-20',    usd: 5.42, bbd: 10.99 },
  { weight: '21-30',    usd: 5.18, bbd: 10.50 },
  { weight: '31-40',    usd: 4.65, bbd:  9.43 },
  { weight: '41-70',    usd: 4.40, bbd:  8.92 },
  { weight: '71-100',   usd: 3.90, bbd:  7.91 },
  { weight: '101-500',  usd: 3.49, bbd:  7.08 },
  { weight: '501-1000', usd: 2.50, bbd:  5.07 },
  { weight: '1001+',    usd: 2.25, bbd:  4.56 },
]

const INSURANCE: { category: string; rate: number }[] = [
  { category: 'General Merchandise',    rate: 0.81 },
  { category: 'New or Used Machinery',  rate: 0.81 },
  { category: 'Household Goods',        rate: 2.49 },
  { category: 'Fragile Goods',          rate: 3.22 },
  { category: 'Computers/Electronics',  rate: 1.67 },
  { category: 'Fine Arts',              rate: 2.49 },
  { category: 'Precision Instruments',  rate: 1.67 },
  { category: 'Branded Goods',          rate: 0.92 },
  { category: 'Jewelry and Watches',    rate: 5.00 },
]

export function RatesPage() {
  const [mobileOpen, setMobileOpen]     = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const servicesRef = useRef<HTMLDivElement>(null)

  // Calculator state
  const [selectedRate, setSelectedRate] = useState(RATES[0])
  const [weight, setWeight]             = useState('')
  const estimated = weight ? (selectedRate.usd * parseFloat(weight)).toFixed(2) : ''
  const estimatedBBD = weight ? (selectedRate.bbd * parseFloat(weight)).toFixed(2) : ''

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) {
        setServicesOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── NAVBAR ── (same as LandingPage) */}
      <header className="sticky top-0 z-50">
        <div className="bg-white shadow-md border-b-4 border-brand-gold">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-28">
              <Link to="/" className="shrink-0 py-2">
                <img src="/logos/logo-cropped.png" alt="CargoLink Barbados" className="h-24 w-auto drop-shadow-sm" />
              </Link>

              <nav className="hidden lg:flex items-center gap-1 text-[14px] font-semibold text-gray-700 tracking-wide uppercase">
                {[
                  { label: 'Home',       to: '/'       },
                  { label: 'Rates',      to: '/rates'  },
                  { label: 'Contact Us', href: '/#contact' },
                ].map(({ label, to, href }) => (
                  to ? (
                    <Link key={label} to={to} className="relative px-4 py-2 group transition-colors hover:text-brand-navy">
                      {label}
                      <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-brand-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
                    </Link>
                  ) : (
                    <a key={label} href={href!} className="relative px-4 py-2 group transition-colors hover:text-brand-navy">
                      {label}
                      <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-brand-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
                    </a>
                  )
                ))}
                <div ref={servicesRef} className="relative">
                  <button onClick={() => setServicesOpen(!servicesOpen)} className="relative flex items-center gap-1 px-4 py-2 group transition-colors hover:text-brand-navy focus:outline-none">
                    Our Services
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${servicesOpen ? 'rotate-180' : ''}`} />
                    <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-brand-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
                  </button>
                  {servicesOpen && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0 w-72 bg-brand-navy rounded-b-xl shadow-2xl overflow-hidden z-50 border-t-4 border-brand-gold">
                      <Link to="/#air-freight"   onClick={() => setServicesOpen(false)} className="flex items-center gap-3 px-6 py-4 text-sm text-white hover:bg-white/10 transition-colors border-b border-white/10">Express Air Freight</Link>
                      <Link to="/#ocean-freight" onClick={() => setServicesOpen(false)} className="flex items-center gap-3 px-6 py-4 text-sm text-white hover:bg-white/10 transition-colors">Ocean Freight</Link>
                    </div>
                  )}
                </div>
              </nav>

              <div className="hidden lg:flex items-center gap-3">
                <Link to="/login"    className="px-4 py-2 text-sm font-semibold text-brand-navy hover:text-brand-navy-dark transition-colors uppercase tracking-wide">Login</Link>
                <Link to="/register" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-brand-navy rounded-lg hover:bg-brand-navy-dark transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 uppercase tracking-wide">
                  Sign Up <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2.5 rounded-lg bg-brand-navy text-white" aria-label="Menu">
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
        {mobileOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg px-4 py-3 space-y-1">
            <Link to="/"       onClick={() => setMobileOpen(false)} className="block py-3 text-sm font-semibold text-gray-800 border-b border-gray-100 uppercase tracking-wide">Home</Link>
            <Link to="/rates"  onClick={() => setMobileOpen(false)} className="block py-3 text-sm font-semibold text-gray-800 border-b border-gray-100 uppercase tracking-wide">Rates</Link>
            <a href="/#contact" onClick={() => setMobileOpen(false)} className="block py-3 text-sm font-semibold text-gray-800 uppercase tracking-wide">Contact Us</a>
            <div className="flex gap-3 pt-3">
              <Link to="/login"    onClick={() => setMobileOpen(false)} className="flex-1 text-center py-3 text-sm font-bold text-brand-navy border-2 border-brand-navy rounded-lg uppercase">Login</Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="flex-1 text-center py-3 text-sm font-bold text-white bg-brand-navy rounded-lg uppercase">Sign Up</Link>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO BAND ── */}
      <section className="bg-white py-16 text-center border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4">
          {/* Decorative lines above/below heading — matches reference */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-44 h-1 bg-brand-navy rounded mb-8" />
            <h1 className="text-5xl font-bold text-gray-700">Our Rates</h1>
            <div className="w-44 h-1 bg-brand-navy rounded mt-8" />
          </div>
          <p className="text-gray-700 text-base leading-relaxed max-w-2xl mx-auto">
            CargoLink Barbados charges are calculated according to the higher of actual or volumetric weight
            and any Shipment may be re-weighed and re-measured by CargoLink Barbados to confirm this calculation.
          </p>
        </div>
      </section>

      {/* ── RATE CALCULATOR ── */}
      <section className="py-16 bg-white">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex flex-col items-center mb-10">
            <div className="w-44 h-1 bg-brand-navy rounded mb-8" />
            <h2 className="text-5xl font-bold text-gray-700">Rate Calculator</h2>
            <div className="w-44 h-1 bg-brand-navy rounded mt-8" />
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 shadow-sm border border-gray-200">
            <div className="space-y-6">
              {/* Weight tier selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cost Per (LB/USD)</label>
                <select
                  value={selectedRate.weight}
                  onChange={e => setSelectedRate(RATES.find(r => r.weight === e.target.value) ?? RATES[0])}
                  className="w-full px-4 py-3 rounded-full border border-gray-300 text-base bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                >
                  {RATES.map(r => (
                    <option key={r.weight} value={r.weight}>
                      {r.weight} lb — ${r.usd.toFixed(2)} USD / ${r.bbd.toFixed(2)} BBD per lb
                    </option>
                  ))}
                </select>
              </div>

              {/* Weight input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Weight (lbs)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder="Enter weight in lbs"
                  className="w-full px-4 py-3 rounded-full border border-gray-300 text-base bg-white focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                />
              </div>

              {/* Result */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Estimated Rate (USD)</label>
                  <input
                    readOnly
                    value={estimated ? `$${estimated}` : ''}
                    placeholder="$0.00"
                    className="w-full px-4 py-3 rounded-full border border-gray-200 text-base bg-gray-100 text-brand-navy font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Estimated Rate (BBD)</label>
                  <input
                    readOnly
                    value={estimatedBBD ? `$${estimatedBBD}` : ''}
                    placeholder="$0.00"
                    className="w-full px-4 py-3 rounded-full border border-gray-200 text-base bg-gray-100 text-brand-navy font-bold focus:outline-none"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-400 text-center">
                * Freight estimate only. Handling, brokerage, duties and taxes apply separately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEES ── */}
      <section className="py-10 bg-white border-t border-gray-100">
        <div className="max-w-2xl mx-auto px-4 space-y-3">
          {[
            { label: 'Handling Charge',                         value: 'BBD $10.00' },
            { label: 'Brokerage Fee — Personal (where applicable)', value: 'BBD $35.00 + VAT' },
            { label: 'Brokerage Fee — Commercial Brokerage',    value: 'BBD $35.00 + VAT' },
            { label: 'Foreign Exchange Surcharge',               value: '2% on the freight charges' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-6 py-4">
              <span className="text-gray-700 text-sm font-medium">{label}</span>
              <span className="text-brand-navy font-bold text-sm">{value}</span>
            </div>
          ))}

          {/* Duties & Taxes */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-5">
            <h4 className="font-bold text-gray-800 mb-2">Duties &amp; Taxes</h4>
            <p className="text-gray-600 text-sm leading-relaxed">
              If you purchase an item(s) and the total value is <strong>USD$30.00 or less</strong>, customs duties is not applicable.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed mt-2">
              If you purchase an item(s) and the total value exceeds USD$30.00, duties are applied. Items attract different rates of duty
              and this is determined by the Barbados Customs Authority. Our Duty Calculator gives you a guide for the duties for most
              common items. Please note that this is a guide only.
            </p>
          </div>
        </div>
      </section>

      {/* ── RATES TABLE ── */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200">
            {/* Table header */}
            <div className="grid grid-cols-3 bg-brand-navy text-white">
              {['Weight (Lb)', 'COST (LB) USD', 'COST (LB) BBD'].map(h => (
                <div key={h} className="px-6 py-4 text-center font-bold text-base uppercase tracking-wide">{h}</div>
              ))}
            </div>
            {/* Table rows */}
            {RATES.map((r, i) => (
              <div key={r.weight} className={`grid grid-cols-3 border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-brand-navy/5 transition-colors`}>
                <div className="px-6 py-4 text-center font-semibold text-gray-800 text-lg">{r.weight}</div>
                <div className="px-6 py-4 text-center text-gray-700 text-lg">$ {r.usd.toFixed(2)}</div>
                <div className="px-6 py-4 text-center text-brand-navy font-bold text-lg">$ {r.bbd.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INSURANCE RATES ── */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex flex-col items-center mb-8">
            <div className="w-44 h-1 bg-brand-navy rounded mb-8" />
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-700 text-center">CargoLink Barbados Coverage Insurance Rates</h2>
            <div className="w-44 h-1 bg-brand-navy rounded mt-8" />
          </div>
          <p className="text-center text-gray-700 text-base mb-2">Rates are per USD$100 value of insurance coverage.</p>
          <p className="text-center text-gray-700 text-base mb-10">CargoLink Barbados insurance covers the total invoice value of your cargo.</p>

          <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200">
            {/* Header */}
            <div className="grid grid-cols-2 bg-brand-navy text-white">
              <div className="px-6 py-4 font-bold text-base uppercase tracking-wide">Commodity Category</div>
              <div className="px-6 py-4 font-bold text-base uppercase tracking-wide text-right">USD</div>
            </div>
            {/* Rows */}
            {INSURANCE.map((ins, i) => (
              <div key={ins.category} className={`grid grid-cols-2 border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-brand-navy/5 transition-colors`}>
                <div className="px-6 py-4 text-gray-700 text-lg">{ins.category}</div>
                <div className="px-6 py-4 text-brand-navy font-bold text-lg text-right">{ins.rate.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              <img src="/logos/logo-cropped.png" alt="CargoLink Barbados" className="h-16 w-auto mb-3" />
              <p className="text-sm text-gray-500">Caribbean Trading and Cargo Management Inc.</p>
              <div className="flex gap-3 mt-4">
                {[Facebook, Instagram, Twitter, Linkedin].map((Icon, i) => (
                  <a key={i} href="#" className="w-9 h-9 bg-brand-navy rounded-full flex items-center justify-center hover:bg-brand-navy-dark transition-colors">
                    <Icon className="w-4 h-4 text-white" />
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h5 className="text-gray-900 font-bold text-base mb-4">Quick Links</h5>
              <ul className="space-y-2 text-sm text-gray-500">
                {[
                  { label: 'Home',              to: '/'       },
                  { label: 'Rates',             to: '/rates'  },
                  { label: 'Contact Us',        href: '/#contact' },
                  { label: 'Legal',             href: '#'     },
                  { label: 'Terms & Condition', href: '#'     },
                ].map(({ label, to, href }) => (
                  <li key={label}>
                    {to ? (
                      <Link to={to} className="flex items-center gap-2 hover:text-brand-navy transition-colors">
                        <CheckCircle className="w-4 h-4 text-brand-navy" />{label}
                      </Link>
                    ) : (
                      <a href={href!} className="flex items-center gap-2 hover:text-brand-navy transition-colors">
                        <CheckCircle className="w-4 h-4 text-brand-navy" />{label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-gray-900 font-bold text-base mb-4">Contact Info</h5>
              <div className="space-y-4">
                {[
                  { Icon: MapPin, text: 'Suite #1 Ficus Court Brighton,\nSt. Michael, Barbados' },
                  { Icon: Mail,   text: 'info@cargolinkbarbados.com' },
                  { Icon: Phone,  text: '+1246-537-2826' },
                ].map(({ Icon, text }, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-brand-navy rounded-full flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-sm text-gray-500 whitespace-pre-line pt-1.5">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
            <p>Copyright © 2026 Caribbean Trading and Cargo Management Inc. All Rights Reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
