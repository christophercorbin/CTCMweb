import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SiteNav } from '../components/SiteNav'
import {
  Facebook, Instagram, Twitter, Linkedin,
  MapPin, Phone, Mail, CheckCircle,
  ClipboardList, MapPin as MapPinIcon, ShoppingCart, Package, Truck, ArrowRight,
} from 'lucide-react'

const IMG = {
  heroBg:        '/images/hero-bg.jpg',
  airFreightBig: '/images/air-freight-loading.jpg',
  hero:          '/images/cargo-plane-sunset.jpg',
  iconPlane:     '/images/icon-plane.png',
  iconWarehouse: '/images/icon-warehouse.png',
  iconMoney:     '/images/icon-money.png',
  iconCourier:   '/images/icon-courier.png',
}

export function AirFreightPage() {
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
          <img src={IMG.heroBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-brand-navy/70" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <p className="text-brand-gold font-semibold text-sm uppercase tracking-widest mb-3">Our Services</p>
          <h1 className="text-4xl sm:text-[52px] font-bold text-white leading-tight mb-4">
            CargoLink Barbados<br />Express Air Freight
          </h1>
          <p className="text-white/80 text-base max-w-xl leading-relaxed">
            A weekly mailbox and package forwarding service from the USA directly to Barbados.
            Shop online — we handle everything else.
          </p>
        </div>
      </section>

      {/* ── INTRO ── */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div data-animate="left" className="grid grid-cols-2 gap-3">
              <img src={IMG.airFreightBig} alt="Cargo loading" className="w-full rounded-xl object-cover h-64 hover:scale-105 transition-transform duration-500" />
              <img src={IMG.hero}          alt="Cargo plane"   className="w-full rounded-xl object-cover h-64 hover:scale-105 transition-transform duration-500" />
            </div>
            <div data-animate="right">
              <p className="text-[#1141be] font-semibold text-sm uppercase tracking-widest mb-3">Air Freight Service</p>
              <h2 className="text-3xl sm:text-[40px] font-bold text-gray-800 leading-tight mb-5">
                It's As Easy As<br />Sign Up · Shop · Ship
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                CargoLink Barbados offers a weekly mailbox and package service from the USA to Barbados.
                Once you register, you receive a dedicated US shipping address — shop at any US online retailer
                and ship straight to your address.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Our service is a safe and affordable way to enjoy the large selection of goods available
                in the US marketplace right from your computer. Benefit from sites like Amazon, AliExpress,
                and eBay with CargoLink Barbados.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div data-animate className="text-center mb-14">
            <p className="text-[#1141be] font-semibold text-sm uppercase tracking-widest mb-3">Simple Process</p>
            <h2 className="text-3xl sm:text-[44px] font-bold text-gray-800">How It Works</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { step: '01', icon: ClipboardList, title: 'Sign Up',              desc: 'Create your free CargoLink Barbados account online in minutes.' },
              { step: '02', icon: MapPinIcon,    title: 'Get Your US Address',   desc: 'Once registered you will immediately receive your new US shipping address.' },
              { step: '03', icon: ShoppingCart,  title: 'Shop Online',           desc: 'Shop on Amazon, eBay, AliExpress and more. Ship to your new US address. Please refer to our restricted items before ordering.' },
              { step: '04', icon: Package,        title: 'We Receive & Track',   desc: 'Once your cargo is delivered to our Miami warehouse, you can track and monitor the status of your shipments every step of the way.' },
              { step: '05', icon: ClipboardList,  title: 'Clear & Invoice',      desc: 'We process and clear your cargo and advise you of all charges — airfreight, duties, and brokerage fees where applicable.' },
              { step: '06', icon: Truck,          title: 'Collect Your Packages', desc: 'Collect your packages from our offices at #1 Ficus Court, Brighton, St. Michael.' },
            ].map(({ step, icon: Icon, title, desc }, i) => (
              <div key={step} data-animate data-delay={String(i * 100)}
                className="card-lift relative bg-white border border-gray-200 rounded-xl p-8 group">
                <div className="absolute top-5 right-5 text-4xl font-black text-gray-50 select-none leading-none">{step}</div>
                <div className="w-12 h-12 bg-brand-navy rounded-xl flex items-center justify-center mb-5 shadow group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-brand-navy transition-colors">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div data-animate data-delay="300" className="mt-10 bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 text-center max-w-2xl mx-auto">
            <p className="text-amber-800 text-sm font-medium">
              ⚠️ Cargo must reach our Miami warehouse by <strong>noon Thursday</strong> for Friday shipment to Barbados.
            </p>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div data-animate className="text-center mb-14">
            <p className="text-[#1141be] font-semibold text-sm uppercase tracking-widest mb-3">Why Choose Us</p>
            <h2 className="text-3xl sm:text-[44px] font-bold text-gray-800">The CargoLink Advantage</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                img: IMG.iconMoney,
                title: 'Comfort',
                desc: 'A safe way to enjoy the large selection of goods available in the U.S. marketplace right from your computer. Shop confidently knowing your packages are in expert hands.',
              },
              {
                img: IMG.iconWarehouse,
                title: 'Save Time & Money',
                desc: 'Ship your online purchases from sites like Amazon, AliExpress, and eBay with CargoLink Barbados — competitive rates, no hidden fees, weekly departures.',
              },
              {
                img: IMG.iconCourier,
                title: 'Experience',
                desc: 'CTCM specialises in international package forwarding. Consumers and business owners worldwide benefit from establishing a U.S. address with CargoLink Barbados.',
              },
            ].map(({ img, title, desc }, i) => (
              <div key={title} data-animate data-delay={String(i * 130)}
                className="card-lift text-center p-8 rounded-xl border border-gray-100 bg-white group">
                <img src={img} alt={title} className="w-14 h-14 object-contain mx-auto mb-5" />
                <h3 className="text-lg font-bold text-gray-800 mb-3 group-hover:text-brand-navy transition-colors">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 bg-brand-navy text-center">
        <div data-animate className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Ready To Start Shipping?</h2>
          <p className="text-white/70 mb-8">Create your free account today and receive your US address instantly.</p>
          <Link to="/register" className="inline-flex items-center gap-2 px-10 py-4 text-base font-bold text-brand-navy bg-brand-gold rounded-lg hover:opacity-90 transition-all shadow-lg pulse-gold">
            Open Your Account <ArrowRight className="w-5 h-5" />
          </Link>
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
                  <a key={i} href="#" className="w-9 h-9 bg-brand-navy rounded-full flex items-center justify-center hover:bg-brand-navy-dark hover:scale-110 transition-all duration-200">
                    <Icon className="w-4 h-4 text-white" />
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h5 className="text-gray-900 font-bold text-base mb-4">Quick Links</h5>
              <ul className="space-y-2 text-sm text-gray-500">
                {[
                  { label: 'Home',         to: '/'             },
                  { label: 'Air Freight',  to: '/air-freight'  },
                  { label: 'Ocean Freight',to: '/ocean-freight'},
                  { label: 'Rates',        to: '/rates'        },
                ].map(({ label, to }) => (
                  <li key={label}>
                    <Link to={to} className="flex items-center gap-2 hover:text-brand-navy transition-colors">
                      <CheckCircle className="w-4 h-4 text-brand-navy" />{label}
                    </Link>
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
