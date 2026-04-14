import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SiteNav } from '../components/SiteNav'
import { SiteFooter } from '../components/SiteFooter'
import {
  Package, Truck, ArrowRight, Anchor,
} from 'lucide-react'

const IMG = {
  oceanBg:    '/images/ocean-bg.jpg',
  containers: '/images/containers.jpg',
  bandBg:     '/images/band-bg.jpg',
  iconShip:   '/images/icon-ship.png',
  iconWarehouse2: '/images/icon-warehouse2.png',
  iconMoney:  '/images/icon-money.png',
}

export function OceanFreightPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
    const els = document.querySelectorAll('[data-animate]')
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const el = e.target as HTMLElement
          setTimeout(() => el.classList.add('cl-visible'), parseInt(el.dataset.delay || '0'))
          obs.unobserve(el)
        }
      })
    }, { threshold: 0.12 })
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <style>{`
        [data-animate]         { opacity:0; transform:translateY(28px); transition:opacity .65s ease,transform .65s ease; }
        [data-animate="left"]  { transform:translateX(-36px); }
        [data-animate="right"] { transform:translateX(36px); }
        [data-animate].cl-visible,[data-animate="left"].cl-visible,[data-animate="right"].cl-visible { opacity:1; transform:none; }
        .card-lift { transition:transform .25s ease,box-shadow .25s ease; }
        .card-lift:hover { transform:translateY(-5px); box-shadow:0 16px 40px rgba(27,45,120,.12); }
        @keyframes pulseGold { 0%,100%{box-shadow:0 0 0 0 rgba(245,197,24,.55);}60%{box-shadow:0 0 0 14px rgba(245,197,24,0);} }
        .pulse-gold { animation:pulseGold 2.2s ease-in-out infinite; }
      `}</style>

      <SiteNav />

      {/* ── HERO ── */}
      <section className="relative min-h-[420px] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={IMG.oceanBg} alt="" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-brand-navy/75" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <p className="text-brand-gold font-semibold text-sm uppercase tracking-widest mb-3">Our Services</p>
          <h1 className="text-4xl sm:text-[52px] font-bold text-white leading-tight mb-4">
            CargoLink Barbados<br />Ocean Freight
          </h1>
          <p className="text-white/80 text-base max-w-xl leading-relaxed">
            LCL &amp; FCL services from the U.S., Canada, Europe, the UK, and the Far East to the Caribbean.
            Weekly sailings from Miami to Barbados.
          </p>
        </div>
      </section>

      {/* ── INTRO ── */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div data-animate="right">
              <p className="text-[#1141be] font-semibold text-sm uppercase tracking-widest mb-3">Ocean Freight</p>
              <h2 className="text-3xl sm:text-[40px] font-bold text-gray-800 leading-tight mb-5">
                Shipping to Barbados...<br />that's easy!
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                CargoLink Barbados offers a one stop solution. We ship containers, boxes, barrels, dry goods,
                heavy equipment, vehicles, tires, chemicals, home goods and building materials to Barbados.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                Our warehouse is conveniently located in Medley, Florida. The facility boasts over{' '}
                <strong className="text-gray-800">33,000 square feet</strong> of warehouse space, with 11 overhead
                doors and a loading ramp.
              </p>
              <p className="text-gray-600 leading-relaxed">
                We have the ability to receive <strong className="text-gray-800">temperature-controlled cargo</strong>{' '}
                (frozen and chilled) at the facility.
              </p>
            </div>
            <div data-animate="left">
              <img src={IMG.containers} alt="Cargo containers" className="w-full rounded-2xl object-cover h-80 shadow-lg hover:scale-105 transition-transform duration-500" />
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT WE SHIP ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div data-animate className="text-center mb-14">
            <p className="text-[#1141be] font-semibold text-sm uppercase tracking-widest mb-3">We Ship It All</p>
            <h2 className="text-3xl sm:text-[44px] font-bold text-gray-800">What We Can Move</h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto text-sm">
              Full container loads (FCL) and less-than-container-loads (LCL) accepted.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Package,  title: 'Boxes & Barrels',          desc: 'General merchandise, household items, and personal effects in any size.' },
              { icon: Truck,    title: 'Vehicles & Heavy Equipment', desc: 'Cars, trucks, heavy machinery — we handle oversized and overweight cargo.' },
              { icon: Anchor,   title: 'Dry & Temperature Goods',   desc: 'Dry goods, chemicals, building materials, plus frozen and chilled cargo at our Miami facility.' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <div key={title} data-animate data-delay={String(i * 120)}
                className="card-lift h-full bg-white border border-gray-200 rounded-xl p-8 group">
                <div className="w-12 h-12 bg-brand-navy rounded-xl flex items-center justify-center mb-5 shadow group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MID BAND ── */}
      <section className="relative py-20 text-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={IMG.bandBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-brand-navy/75" />
        </div>
        <div data-animate className="relative z-10 max-w-3xl mx-auto px-4">
          <h2 className="text-2xl sm:text-[32px] font-bold text-white leading-snug mb-4">
            Weekly sailing from Miami to Barbados
          </h2>
          <p className="text-white/70 text-base">
            CARGOLINK BARBADOS offers LCL &amp; FCL services from the U.S., Canada, Europe, the UK,
            and the Far East to the Caribbean.
          </p>
        </div>
      </section>

      {/* ── WAREHOUSE ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div data-animate className="text-center mb-14">
            <p className="text-[#1141be] font-semibold text-sm uppercase tracking-widest mb-3">Our Facility</p>
            <h2 className="text-3xl sm:text-[44px] font-bold text-gray-800">Miami Warehouse</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { num: '33,000+', unit: 'Sq Ft',           label: 'of warehouse space in Medley, Florida' },
              { num: '11',      unit: 'Overhead Doors',  label: 'plus a full-length loading ramp' },
              { num: '7 Days',  unit: 'a Week',          label: 'receiving cargo at our Miami facility' },
            ].map(({ num, unit, label }, i) => (
              <div key={unit} data-animate data-delay={String(i * 120)} className="text-center">
                <p className="text-4xl font-black text-brand-navy leading-none">{num}</p>
                <p className="text-brand-gold font-semibold text-lg mt-1">{unit}</p>
                <p className="text-gray-500 text-sm mt-2">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 bg-brand-navy text-center">
        <div data-animate className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Ready to ship with us?</h2>
          <p className="text-white/70 mb-8">Contact our sales team for a quote on your ocean freight shipment.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/#contact" className="inline-flex items-center gap-2 px-10 py-4 text-base font-bold text-brand-navy bg-brand-gold rounded-lg hover:opacity-90 transition-all shadow-lg pulse-gold">
              Request a Quote <ArrowRight className="w-5 h-5" />
            </a>
            <Link to="/register" className="inline-flex items-center gap-2 px-10 py-4 text-base font-bold text-white border-2 border-white rounded-lg hover:bg-white hover:text-brand-navy transition-all">
              Open an account
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
