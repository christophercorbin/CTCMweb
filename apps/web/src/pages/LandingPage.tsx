import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  MapPin,
  Phone,
  Mail,
  Package,
  ShoppingCart,
  Truck,
  ClipboardList,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { SiteFooter } from '../components/SiteFooter'
import { SiteNav } from '../components/SiteNav'

// All images served locally from /public/images/
const IMG = {
  heroBg:        '/images/hero-bg.jpg',
  bandBg:        '/images/band-bg.jpg',
  oceanBg:       '/images/ocean-bg.jpg',
  containers:    '/images/containers.jpg',
  airFreightBig: '/images/air-freight-loading.jpg',
  airFreightPlan:'/images/air-freight-plane.png',
  packages:      '/images/packages-collage.webp',
  hero:          '/images/cargo-plane-sunset.jpg',
  iconPlane:     '/images/icon-plane.png',
  iconCargo:     '/images/icon-cargo.png',
  iconWarehouse: '/images/icon-warehouse.png',
  iconWarehouse2:'/images/icon-warehouse2.png',
  iconShip:      '/images/icon-ship.png',
  iconTruck:     '/images/icon-truck.png',
  iconMoney:     '/images/icon-money.png',
  iconCourier:   '/images/icon-courier.png',
}


export function LandingPage() {
  const { isAuthenticated, user } = useAuth()

  const dashboardPath = user?.role === 'admin' ? '/admin/dashboard' : '/dashboard'

  /* Scroll-reveal — fail-safe: content is visible by default.
     We OPT IN to the animation by adding .cl-animate once the observer fires,
     so if JS fails the page is still fully readable.
     Respects prefers-reduced-motion. */
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return
    const els = document.querySelectorAll('[data-animate]')
    // Set initial hidden state now that we know JS is running
    els.forEach((el) => el.classList.add('cl-pre'))
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const el = e.target as HTMLElement
          const delay = parseInt(el.dataset.delay || '0')
          setTimeout(() => {
            el.classList.remove('cl-pre')
            el.classList.add('cl-visible')
          }, delay)
          obs.unobserve(el)
        }
      })
    }, { threshold: 0.08 })
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── Global animation styles ── */}
      <style>{`
        /* Scroll-reveal — FAIL-SAFE.
           Content is visible by default. Only when JS adds .cl-pre
           does the element hide, and .cl-visible fades it back in.
           If JS never runs, the whole page stays readable. */
        [data-animate]                     { transition:opacity .65s ease, transform .65s ease; }
        [data-animate].cl-pre              { opacity:0; transform:translateY(32px); }
        [data-animate="left"].cl-pre       { opacity:0; transform:translateX(-40px); }
        [data-animate="right"].cl-pre      { opacity:0; transform:translateX(40px); }
        [data-animate="scale"].cl-pre      { opacity:0; transform:scale(0.88); }
        [data-animate="fade"].cl-pre       { opacity:0; transform:none; }
        [data-animate].cl-visible          { opacity:1; transform:none; }

        /* Hero staggered entrance */
        @keyframes heroUp {
          from { opacity:0; transform:translateY(28px); }
          to   { opacity:1; transform:none; }
        }
        .hero-1 { animation:heroUp .75s ease .05s both; }
        .hero-2 { animation:heroUp .75s ease .25s both; }
        .hero-3 { animation:heroUp .75s ease .45s both; }
        .hero-4 { animation:heroUp .75s ease .65s both; }

        /* Floating icon */
        @keyframes floatY {
          0%,100% { transform:translateY(0); }
          50%      { transform:translateY(-9px); }
        }
        .float-anim { animation:floatY 3.2s ease-in-out infinite; }

        /* Gold pulse on CTA button */
        @keyframes pulseGold {
          0%,100% { box-shadow:0 0 0 0 rgba(245,197,24,.55); }
          60%      { box-shadow:0 0 0 14px rgba(245,197,24,0); }
        }
        .pulse-gold { animation:pulseGold 2.2s ease-in-out infinite; }

/* Card hover lift */
        .card-lift { transition:transform .25s ease, box-shadow .25s ease; }
        .card-lift:hover { transform:translateY(-5px); box-shadow:0 16px 40px rgba(27,45,120,.12); }

        /* Step number watermark */
        .step-num { transition:color .3s, transform .3s; }
        .step-card:hover .step-num { color:rgba(27,45,120,.12); transform:scale(1.15); }

        /* Underline draw on nav links (landing) */
        /* already handled inline via Tailwind */
      `}</style>
      {/* ── HEADER ── */}
      <SiteNav />

      {/* ── HERO ── */}
      <section id="hero" className="relative min-h-[640px] flex items-center justify-center text-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={IMG.heroBg}
            alt=""
            className="w-full h-full object-cover object-center scale-105"
            style={{ animation: 'none' }}
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-brand-navy/75" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-28">
          <p className="hero-1 text-brand-gold font-semibold text-xl mb-4 tracking-wide">Smart Shipping to the Caribbean</p>
          <h1 className="hero-2 text-4xl sm:text-5xl lg:text-[65px] font-bold text-white leading-tight mb-6">
            Welcome to CargoLink Barbados
          </h1>
          <p className="hero-3 text-white/80 text-base leading-relaxed mb-8 max-w-xl mx-auto">
            CargoLink Barbados provides a complete logistics solution including freight forwarding,
            customs clearance, package consolidation, and door-to-door delivery.
          </p>

          {/* Primary CTA — auth-aware */}
          <div className="hero-4 flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            {isAuthenticated ? (
              <Link
                to={dashboardPath}
                className="inline-flex items-center justify-center gap-2 px-10 py-4 text-base font-semibold text-white bg-brand-navy rounded-lg hover:bg-brand-navy-dark transition-all shadow-lg border border-white/20 pulse-gold"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 px-10 py-4 text-base font-semibold text-brand-navy bg-brand-gold rounded-lg hover:brightness-95 transition-all shadow-lg pulse-gold"
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-white/10 backdrop-blur rounded-lg hover:bg-white/20 transition-all border border-white/30"
                >
                  Contact Us
                </a>
              </>
            )}
          </div>

        </div>
      </section>

      {/* ── WHO WE ARE ── */}
      <section id="about" className="py-20" style={{ backgroundColor: '#f7f8ff' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">

            {/* Left: 2-column image grid */}
            <div data-animate="left" className="grid grid-cols-2 gap-3">
              <div className="space-y-3">
                <img src={IMG.containers}    alt="Cargo containers" loading="lazy" className="w-full rounded-xl object-cover h-44 hover:scale-105 transition-transform duration-500" />
                <img src={IMG.packages}      alt="CargoLink packages" loading="lazy" className="w-full rounded-xl object-cover hover:scale-105 transition-transform duration-500" />
              </div>
              <div>
                <img src={IMG.airFreightPlan} alt="CargoLink Barbados aircraft" loading="lazy" className="w-full rounded-xl object-cover h-full hover:scale-105 transition-transform duration-500" style={{ minHeight: '380px' }} />
              </div>
            </div>

            {/* Right: text */}
            <div data-animate="right">
              <p className="text-[#1141be] font-semibold text-sm uppercase tracking-widest mb-3">Who We Are</p>
              <h2 className="text-3xl sm:text-[44px] font-bold text-gray-800 leading-tight mb-6">
                Your Trusted Caribbean Shipping Partner
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4 text-justify">
                CargoLink Barbados is owned by Caribbean Trading and Cargo Management Inc. is a Barbadian company established in 2017.
              </p>
              <p className="text-gray-600 leading-relaxed mb-10 text-justify">
                Our management has over 25 years of experience in international shipping specialising in Air freight and Ocean freight logistics into the Caribbean.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { img: IMG.iconMoney,   title: 'Affordable Cost',    desc: 'Competitive rates with no hidden fees. Charges calculated by actual or volumetric weight.' },
                  { img: IMG.iconCourier, title: 'Short Time Delivery', desc: 'Weekly flights and sailings from Miami on a reliable, predictable schedule.' },
                ].map(({ img, title, desc }, i) => (
                  <div key={title} data-animate data-delay={String(200 + i * 150)} className="flex items-start gap-4">
                    <img src={img} alt={title} className="w-14 h-14 object-contain shrink-0 float-anim" />
                    <div>
                      <h4 className="font-bold text-gray-800 text-base mb-1">{title}</h4>
                      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MID-PAGE BAND ── */}
      <section className="relative py-24 overflow-hidden text-center">
        <div className="absolute inset-0">
          <img src={IMG.bandBg} alt="" loading="lazy" className="w-full h-full object-cover object-center scale-110" style={{ animation: 'floatY 8s ease-in-out infinite' }} />
          <div className="absolute inset-0 bg-brand-navy/70" />
        </div>
        <div data-animate="scale" className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <p className="text-brand-gold font-semibold text-xl mb-4 tracking-wide">The Smarter Way To Ship</p>
          <h2 className="text-2xl sm:text-[30px] font-bold text-white leading-snug text-center">
            Air Freight And Ocean Freight Logistics<br />
            Into the Caribbean<br />
            Shop, Consolidate, Then Leave The Rest To Us!
          </h2>
        </div>
      </section>

      {/* ── OUR SHIPPING SERVICES ── */}
      <section id="services" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div data-animate className="text-center mb-14">
            <p className="text-[#1141be] font-semibold text-sm uppercase tracking-widest mb-3">What We Do</p>
            <h2 className="text-3xl sm:text-[44px] font-bold text-gray-800 mb-4">Our Shipping Services</h2>
            <p className="text-gray-500 text-base max-w-2xl mx-auto">
              Reliable air and ocean freight solutions designed to move your cargo safely and efficiently to the Caribbean.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { img: IMG.iconPlane,      title: 'Air Freight',               desc: 'Fast and reliable weekly air freight service from Miami to Barbados.' },
              { img: IMG.iconShip,       title: 'Ocean Freight',             desc: 'Cost-effective LCL and FCL ocean freight shipping from the U.S., Canada, Europe, the UK, and the Far East to the Caribbean.' },
              { img: IMG.iconWarehouse2, title: 'Warehouse & Cargo Handling', desc: 'Our warehouse in Medley, Florida offers over 33,000 sq ft of storage space and can handle dry goods, heavy equipment, vehicles, and temperature-controlled cargo.' },
            ].map(({ img, title, desc }, i) => (
              <div key={title} data-animate data-delay={String(i * 130)}
                className="card-lift border border-gray-200 rounded-xl p-8 cursor-default">
                <div className="float-anim w-14 h-14 rounded-xl bg-brand-navy flex items-center justify-center mb-5 shadow">
                  <img src={img} alt={title} className="w-8 h-8 object-contain brightness-0 invert" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-3">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AIR FREIGHT ── */}
      <section id="air-freight" className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 data-animate className="text-3xl sm:text-[44px] font-bold text-gray-800 mb-12">Air Freight</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

            {/* Left: two photos */}
            <div data-animate="left" className="grid grid-cols-2 gap-3">
              <img src={IMG.airFreightBig} alt="Cargo being loaded onto aircraft" loading="lazy" className="w-full rounded-xl object-cover hover:scale-105 transition-transform duration-500" style={{ height: '500px' }} />
              <img src={IMG.hero}          alt="Cargo plane at sunset"            loading="lazy" className="w-full rounded-xl object-cover hover:scale-105 transition-transform duration-500" style={{ height: '500px' }} />
            </div>

            {/* Right: 3 steps */}
            <div className="space-y-10 pt-4">
              {[
                { num: '01', title: 'Purchase Online',     desc: 'Buy online. Ship to your U.S mailing address.' },
                { num: '02', title: 'Bundle Your Packages', desc: 'You shop. We take care of everything else.' },
                { num: '03', title: 'One Time Pick Up',    desc: 'Visit a CargoLink Barbados location and pick up your cargo.' },
              ].map(({ num, title, desc }, i) => (
                <div key={num} data-animate="right" data-delay={String(i * 150)} className="flex gap-6 items-start">
                  <div className="shrink-0 w-14 h-14 rounded-full bg-brand-navy flex items-center justify-center shadow-md hover:scale-110 transition-transform duration-300">
                    <span className="text-white font-bold text-sm">{num}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
                    <p className="text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── OCEAN FREIGHT ── */}
      <section id="ocean-freight" className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <img src={IMG.oceanBg} alt="" loading="lazy" className="w-full h-full object-cover object-center scale-105" style={{ transition: 'transform 8s ease' }} />
          <div className="absolute inset-0 bg-brand-navy/75" />
        </div>
        <div data-animate="right" className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl sm:text-[45px] font-bold text-white mb-6">Ocean Freight</h2>
          <h3 className="text-2xl sm:text-[35px] font-bold text-white mb-6">Shipping To Barbados...That's Easy!</h3>
          <p className="text-white/80 text-base leading-relaxed mb-4 text-justify">
            CargoLink Barbados offers a one stop solution.
          </p>
          <p className="text-white/80 text-base leading-relaxed mb-4 text-justify">
            We ship containers, boxes, barrels, dry goods, heavy equipment, vehicles, tires, chemicals, home goods and building materials to Barbados.
          </p>
          <p className="text-white/80 text-base leading-relaxed mb-8 text-justify">
            Our warehouse is conveniently located in Medley, Florida. The facility boasts over 33,000 square feet of warehouse space, with 11 overhead doors and a loading ramp. We have the ability to receive temperature-controlled cargo (frozen and chilled) at the facility.
          </p>
          <h3 className="text-2xl sm:text-[30px] font-bold text-white">Weekly Sailing From Miami To Barbados.</h3>
        </div>
      </section>

      {/* ── SALES TEAM CTA ── */}
      <section className="py-16 bg-white text-center">
        <div data-animate className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Our sales team is here to help</h2>
          <a href="#contact" className="inline-flex items-center gap-2 px-10 py-4 text-base font-semibold text-white bg-brand-navy rounded-lg hover:bg-brand-navy-dark transition-all shadow-lg mb-10 pulse-gold">
            Request a Quote
          </a>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="mailto:info@cargolinkbarbados.com"
              className="card-lift inline-flex items-center gap-4 px-6 py-5 rounded-xl border border-gray-200 bg-white hover:border-brand-navy hover:text-brand-navy transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-full bg-brand-navy flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Email</p>
                <p className="text-sm font-semibold text-gray-800">info@cargolinkbarbados.com</p>
              </div>
            </a>
            <a
              href="tel:+12465372826"
              className="card-lift inline-flex items-center gap-4 px-6 py-5 rounded-xl border border-gray-200 bg-white hover:border-brand-navy hover:text-brand-navy transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-full bg-brand-navy flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Phone</p>
                <p className="text-sm font-semibold text-gray-800">+1-246-537-2826</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div data-animate className="text-center mb-8">
            <p className="text-[#1141be] font-semibold text-sm uppercase tracking-widest mb-3">Simple Process</p>
            <h2 className="text-3xl sm:text-[44px] font-bold text-gray-800">How It Works</h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto text-sm">
              Air &amp; Ocean freight logistics into the Caribbean — shop online, then leave the rest to us.
            </p>
          </div>

          {/* Cutoff notice — placed prominently above the steps */}
          <div data-animate className="mb-10 flex justify-center">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 inline-flex items-center gap-3 max-w-full overflow-x-auto">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-amber-800 text-sm font-medium whitespace-nowrap">
                Cargo must reach our Miami warehouse by <strong>noon Thursday</strong> for Friday shipment to Barbados.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { step: '01', icon: ClipboardList, title: 'Sign Up',              desc: 'Create your free CargoLink Barbados account online in minutes.' },
              { step: '02', icon: MapPin,         title: 'Get Your US Address',  desc: 'Once registered you will immediately receive your new US shipping address.' },
              { step: '03', icon: ShoppingCart,   title: 'Shop Online',          desc: 'Shop on Amazon, eBay, AliExpress and more. Ship to your new US address.' },
              { step: '04', icon: Package,         title: 'We Receive & Track',   desc: 'Once your cargo arrives at our Miami warehouse you can track every step.' },
              { step: '05', icon: ClipboardList,   title: 'Clear & Invoice',      desc: 'We process and clear your cargo and advise you of all freight, duties, and fees.' },
              { step: '06', icon: Truck,           title: 'Collect Your Packages', desc: 'Collect your packages from our offices at #1 Ficus Court, Brighton, St. Michael.' },
            ].map(({ step, icon: Icon, title, desc }, i) => (
              <div key={step} data-animate data-delay={String(i * 100)}
                className="step-card card-lift relative bg-white border border-gray-200 rounded-xl p-8 group">
                {/* Solid navy numbered badge — replaces faint watermark */}
                <div className="absolute -top-4 -right-4 w-11 h-11 rounded-full bg-brand-navy text-white flex items-center justify-center shadow-md ring-4 ring-gray-50">
                  <span className="text-sm font-bold">{step}</span>
                </div>
                <div className="w-12 h-12 bg-brand-navy rounded-xl flex items-center justify-center mb-5 shadow group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-brand-navy transition-colors">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div data-animate className="text-center mb-14">
            <p className="text-[#1141be] font-semibold text-sm uppercase tracking-widest mb-3">Get In Touch</p>
            <h2 className="text-3xl sm:text-[44px] font-bold text-gray-800">Contact Us</h2>
            <p className="mt-4 text-gray-500 text-sm">We're here to help you ship smarter.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: MapPin, label: 'Address',       detail: 'Suite #1 Ficus Court Brighton,\nSt. Michael, Barbados', href: undefined },
              { icon: Phone,  label: 'Phone Number',  detail: '+1-246-537-2826',             href: 'tel:+12465372826' },
              { icon: Mail,   label: 'Email Address', detail: 'info@cargolinkbarbados.com', href: 'mailto:info@cargolinkbarbados.com' },
            ].map(({ icon: Icon, label, detail, href }, i) => (
              <div key={label} data-animate data-delay={String(i * 120)} className="flex flex-col items-center text-center group">
                <div className="w-14 h-14 rounded-full bg-brand-navy flex items-center justify-center mb-4 shadow group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">{label}</h4>
                {href
                  ? <a href={href} className="text-sm text-brand-navy hover:underline whitespace-pre-line">{detail}</a>
                  : <p className="text-sm text-gray-500 whitespace-pre-line">{detail}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />

    </div>
  )
}
