import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  Package,
  ShoppingCart,
  Truck,
  ClipboardList,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Menu,
  X,
  ArrowRight,
  ChevronDown,
} from 'lucide-react'

// All images served locally from /public/images/
// Remote fallbacks point to shinebarbados.maktechinstitute.com (may be unavailable)
const IMG = {
  // Backgrounds
  heroBg:        '/images/hero-bg.jpg',
  bandBg:        '/images/band-bg.jpg',
  oceanBg:       '/images/ocean-bg.jpg',
  // Content photos
  containers:    '/images/containers.jpg',
  airFreightBig: '/images/air-freight-loading.jpg',
  airFreightPlan:'/images/air-freight-plane.png',
  packages:      '/images/packages-collage.webp',
  hero:          '/images/cargo-plane-sunset.jpg',
  // Icons
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

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50">
        <div className="bg-white shadow-md border-b-4 border-brand-gold">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-28">

              {/* Logo */}
              <a href="#hero" className="shrink-0 py-2">
                <img
                  src="/logos/logo-cropped.png"
                  alt="CargoLink Barbados — The Smarter way to ship"
                  className="h-24 w-auto drop-shadow-sm"
                />
              </a>

              {/* Desktop nav */}
              <nav className="hidden lg:flex items-center gap-1 text-[14px] font-semibold text-gray-700 tracking-wide uppercase">
                {[
                  { label: 'Home',       href: '#hero'    },
                  { label: 'Contact Us', href: '#contact' },
                ].map(({ label, href }) => (
                  <a key={label} href={href} className="relative px-4 py-2 group transition-colors hover:text-brand-navy">
                    {label}
                    <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-brand-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
                  </a>
                ))}
                <Link to="/rates" className="relative px-4 py-2 group transition-colors hover:text-brand-navy">
                  Rates
                  <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-brand-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
                </Link>

                {/* Our Services dropdown */}
                <div ref={servicesRef} className="relative">
                  <button
                    onClick={() => setServicesOpen(!servicesOpen)}
                    className="relative flex items-center gap-1 px-4 py-2 group transition-colors hover:text-brand-navy focus:outline-none"
                  >
                    Our Services
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${servicesOpen ? 'rotate-180' : ''}`} />
                    <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-brand-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
                  </button>
                  {servicesOpen && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0 w-72 bg-brand-navy rounded-b-xl shadow-2xl overflow-hidden z-50 border-t-4 border-brand-gold">
                      <a href="#air-freight" onClick={() => setServicesOpen(false)} className="flex items-center gap-3 px-6 py-4 text-sm text-white hover:bg-white/10 transition-colors border-b border-white/10">
                        <img src={IMG.iconPlane} className="w-6 h-6 object-contain invert" alt="" />
                        CargoLink Barbados Express Air Freight
                      </a>
                      <a href="#ocean-freight" onClick={() => setServicesOpen(false)} className="flex items-center gap-3 px-6 py-4 text-sm text-white hover:bg-white/10 transition-colors">
                        <img src={IMG.iconShip} className="w-6 h-6 object-contain invert" alt="" />
                        CargoLink Barbados Ocean Freight
                      </a>
                    </div>
                  )}
                </div>
              </nav>

              {/* Right: Login + Sign Up */}
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
              <a href="#hero"     onClick={() => setMobileOpen(false)} className="flex items-center justify-between py-3 text-sm font-semibold text-gray-800 hover:text-brand-navy border-b border-gray-100 uppercase tracking-wide">Home <ChevronDown className="w-4 h-4 -rotate-90" /></a>
              <div className="border-b border-gray-100">
                <p className="py-3 text-sm font-semibold text-gray-800 uppercase tracking-wide">Our Services</p>
                <a href="#air-freight"   onClick={() => setMobileOpen(false)} className="flex items-center gap-2 pl-4 pb-2.5 text-sm text-gray-600 hover:text-brand-navy"><img src={IMG.iconPlane} className="w-5 h-5 object-contain" alt="" /> Express Air Freight</a>
                <a href="#ocean-freight" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 pl-4 pb-3   text-sm text-gray-600 hover:text-brand-navy"><img src={IMG.iconShip}  className="w-5 h-5 object-contain" alt="" /> Ocean Freight</a>
              </div>
              <Link to="/rates"  onClick={() => setMobileOpen(false)} className="flex items-center justify-between py-3 text-sm font-semibold text-gray-800 hover:text-brand-navy border-b border-gray-100 uppercase tracking-wide">Rates <ChevronDown className="w-4 h-4 -rotate-90" /></Link>
              <a href="#contact" onClick={() => setMobileOpen(false)} className="flex items-center justify-between py-3 text-sm font-semibold text-gray-800 hover:text-brand-navy uppercase tracking-wide">Contact Us <ChevronDown className="w-4 h-4 -rotate-90" /></a>
            </div>
            <div className="flex gap-3 px-4 pb-4">
              <Link to="/login"    onClick={() => setMobileOpen(false)} className="flex-1 text-center py-3 text-sm font-bold text-brand-navy border-2 border-brand-navy rounded-lg uppercase tracking-wide hover:bg-brand-navy hover:text-white transition-colors">Login</Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="flex-1 text-center py-3 text-sm font-bold text-white bg-brand-navy rounded-lg uppercase tracking-wide hover:bg-brand-navy-dark transition-colors">Sign Up</Link>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section id="hero" className="relative min-h-[600px] flex items-center justify-center text-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={IMG.heroBg} alt="CargoLink Barbados hero" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-brand-navy/60" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-28">
          <p className="text-brand-gold font-semibold text-xl mb-4 tracking-wide">Smart Shipping To The Caribbean</p>
          <h1 className="text-4xl sm:text-5xl lg:text-[65px] font-bold text-white leading-tight mb-6">
            Welcome To CargoLink Barbados
          </h1>
          <p className="text-white/80 text-base leading-relaxed mb-10 max-w-xl mx-auto">
            CargoLink Barbados provides a complete logistics solution including freight forwarding,
            customs clearance, package consolidation, and door-to-door delivery.
          </p>
          <a href="#contact" className="inline-flex items-center justify-center gap-2 px-10 py-4 text-base font-semibold text-white bg-brand-navy rounded-lg hover:bg-brand-navy-dark transition-all shadow-lg border border-white/20">
            Contact Us
          </a>
        </div>
      </section>

      {/* ── THREE SERVICE CARDS ── */}
      <section className="py-14 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { img: IMG.iconTruck,     title: 'Global Freight Solutions',  desc: 'We provide reliable international freight solutions to move your cargo safely and efficiently across global routes and Caribbean destinations.' },
              { img: IMG.iconCargo,     title: 'Cargo Transportation',      desc: 'Our transportation services ensure secure and timely movement of goods, handling everything from small packages to large shipments.' },
              { img: IMG.iconWarehouse, title: 'Secure Storage Services',   desc: 'Safe and organized warehouse storage designed to protect your cargo before shipment or delivery to its final destination.' },
            ].map(({ img, title, desc }) => (
              <div key={title} className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
                <img src={img} alt={title} className="w-14 h-14 object-contain mb-5" />
                <h3 className="text-lg font-bold text-gray-800 mb-3">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO WE ARE ── */}
      <section id="about" className="py-20" style={{ backgroundColor: '#f7f8ff' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">

            {/* Left: 2-column image grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-3">
                <img src={IMG.containers}    alt="Cargo containers" className="w-full rounded-xl object-cover h-44" />
                <img src={IMG.packages}      alt="CargoLink packages" className="w-full rounded-xl object-cover" />
              </div>
              <div>
                <img src={IMG.airFreightPlan} alt="CargoLink Barbados aircraft" className="w-full rounded-xl object-cover h-full" style={{ minHeight: '380px' }} />
              </div>
            </div>

            {/* Right: text */}
            <div>
              <p className="text-[#1141be] font-semibold text-sm uppercase tracking-widest mb-3">Who We Are</p>
              <h2 className="text-3xl sm:text-[44px] font-bold text-gray-800 leading-tight mb-6">
                Your Trusted Caribbean Shipping Partner
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                CargoLink Barbados is owned by Caribbean Trading and Cargo Management Inc. is a Barbadian company established in 2017.
              </p>
              <p className="text-gray-600 leading-relaxed mb-10">
                Our management has over 25 years of experience in international shipping specialising in Air freight and Ocean freight logistics into the Caribbean.
              </p>

              {/* Two feature items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { img: IMG.iconMoney,   title: 'Affordable Cost',    desc: 'Competitive rates with no hidden fees. Charges calculated by actual or volumetric weight.' },
                  { img: IMG.iconCourier, title: 'Short Time Delivery', desc: 'Weekly flights and sailings from Miami on a reliable, predictable schedule.' },
                ].map(({ img, title, desc }) => (
                  <div key={title} className="flex items-start gap-4">
                    <img src={img} alt={title} className="w-14 h-14 object-contain shrink-0" />
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
      <section className="relative py-20 overflow-hidden text-center">
        <div className="absolute inset-0">
          <img src={IMG.bandBg} alt="" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-brand-navy/70" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-4">
          <p className="text-brand-gold font-semibold text-xl mb-4 tracking-wide">The Smarter Way To Ship</p>
          <h2 className="text-2xl sm:text-[30px] font-bold text-white leading-snug">
            Air Freight And Ocean Freight Logistics Into The Caribbean<br className="hidden sm:block" />
            Shop, Consolidate, Then Leave The Rest To Us!
          </h2>
        </div>
      </section>

      {/* ── OUR SHIPPING SERVICES ── */}
      <section id="services" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
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
            ].map(({ img, title, desc }) => (
              <div key={title} className="border border-gray-200 rounded-xl p-8 hover:shadow-md transition-shadow">
                <img src={img} alt={title} className="w-12 h-12 object-contain mb-5" />
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
          <h2 className="text-3xl sm:text-[44px] font-bold text-gray-800 mb-12">AIR FREIGHT</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

            {/* Left: two photos side by side */}
            <div className="grid grid-cols-2 gap-3">
              <img src={IMG.airFreightBig} alt="Cargo being loaded onto aircraft" className="w-full rounded-xl object-cover" style={{ height: '500px' }} />
              <img src={IMG.hero}          alt="Cargo plane at sunset"            className="w-full rounded-xl object-cover" style={{ height: '500px' }} />
            </div>

            {/* Right: 3 steps */}
            <div className="space-y-10 pt-4">
              {[
                { num: '01', title: 'Purchase Online',     desc: 'Buy online. Ship to your U.S mailing address.' },
                { num: '02', title: 'Bundle Your Packages', desc: 'You shop. We take care of everything else.' },
                { num: '03', title: 'One Time Pick Up',    desc: 'Visit a CargoLink Barbados location and pick up your cargo.' },
              ].map(({ num, title, desc }) => (
                <div key={num} className="flex gap-6 items-start">
                  <div className="shrink-0 w-14 h-14 rounded-full bg-brand-navy flex items-center justify-center shadow-md">
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
          <img src={IMG.oceanBg} alt="Container port" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-brand-navy/75" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl sm:text-[45px] font-bold text-white mb-6">OCEAN FREIGHT</h2>
          <h3 className="text-2xl sm:text-[35px] font-bold text-white mb-6">Shipping To Barbados...That's Easy!</h3>
          <p className="text-white/80 text-base leading-relaxed mb-4">
            CargoLink Barbados offers a one stop solution.
          </p>
          <p className="text-white/80 text-base leading-relaxed mb-4">
            We ship containers, boxes, barrels, dry goods, heavy equipment, vehicles, tires, chemicals, home goods and building materials to Barbados.
          </p>
          <p className="text-white/80 text-base leading-relaxed mb-8">
            Our warehouse is conveniently located in Medley, Florida. The facility boasts over 33,000 square feet of warehouse space, with 11 overhead doors and a loading ramp. We have the ability to receive temperature-controlled cargo (frozen and chilled) at the facility.
          </p>
          <h3 className="text-2xl sm:text-[30px] font-bold text-white">Weekly Sailing From Miami To Barbados.</h3>
        </div>
      </section>

      {/* ── SALES TEAM CTA ── */}
      <section className="py-16 bg-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Our Sales Team Is Here To Help</h2>
          <a href="#contact" className="inline-flex items-center gap-2 px-10 py-4 text-base font-semibold text-white bg-brand-navy rounded-lg hover:bg-brand-navy-dark transition-all shadow-lg mb-8">
            Request A Quote
          </a>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-600 mt-2">
            <a href="mailto:info@cariblinkbarbados.com" className="flex items-center gap-2 hover:text-brand-navy transition-colors">
              <Mail className="w-4 h-4 text-brand-navy" /> info@cariblinkbarbados.com
            </a>
            <a href="tel:+12465372826" className="flex items-center gap-2 hover:text-brand-navy transition-colors">
              <Phone className="w-4 h-4 text-brand-navy" /> +1246-537-2826
            </a>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[#1141be] font-semibold text-sm uppercase tracking-widest mb-3">Simple Process</p>
            <h2 className="text-3xl sm:text-[44px] font-bold text-gray-800">How It Works</h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto text-sm">
              Air &amp; Ocean freight logistics into the Caribbean — shop online, then leave the rest to us.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { step: '01', icon: ClipboardList, title: 'Sign Up',              desc: 'Create your free CargoLink Barbados account online in minutes.' },
              { step: '02', icon: MapPin,         title: 'Get Your US Address',  desc: 'Once registered you will immediately receive your new US shipping address.' },
              { step: '03', icon: ShoppingCart,   title: 'Shop Online',          desc: 'Shop on Amazon, eBay, AliExpress and more. Ship to your new US address.' },
              { step: '04', icon: Package,         title: 'We Receive & Track',   desc: 'Once your cargo arrives at our Miami warehouse you can track every step.' },
              { step: '05', icon: ClipboardList,   title: 'Clear & Invoice',      desc: 'We process and clear your cargo and advise you of all freight, duties, and fees.' },
              { step: '06', icon: Truck,           title: 'Collect Your Packages', desc: 'Collect your packages from our offices at #1 Ficus Court, Brighton, St. Michael.' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative bg-white border border-gray-200 rounded-xl p-8">
                <div className="absolute top-5 right-5 text-4xl font-black text-gray-50 select-none leading-none">{step}</div>
                <div className="w-12 h-12 bg-brand-navy rounded-xl flex items-center justify-center mb-5 shadow">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 text-center max-w-2xl mx-auto">
            <p className="text-amber-800 text-sm font-medium">
              ⚠️ Cargo must reach our Miami warehouse by <strong>noon Thursday</strong> for Friday shipment to Barbados.
            </p>
          </div>
        </div>
      </section>

      {/* ── RATES ── */}
      <section id="rates" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[#1141be] font-semibold text-sm uppercase tracking-widest mb-3">Transparent Pricing</p>
            <h2 className="text-3xl sm:text-[44px] font-bold text-gray-800">Air Freight Rates</h2>
            <p className="mt-4 text-gray-500 text-sm max-w-xl mx-auto">
              Charges are calculated by the higher of actual or volumetric weight. All rates are per pound.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div className="bg-white rounded-2xl overflow-hidden shadow border border-gray-200">
              <div className="px-6 py-4 bg-brand-navy">
                <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Miami Shipping Rate — Cost Per Lb</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-gray-500 font-medium">Weight (lb)</th>
                    <th className="text-right px-6 py-3 text-gray-500 font-medium">USD / lb</th>
                    <th className="text-right px-6 py-3 text-gray-500 font-medium">BBD / lb</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    ['1','8.45','17.33'],['2','7.31','14.82'],['3','7.07','14.35'],['4','6.01','12.81'],
                    ['5','5.80','11.76'],['6–11','5.58','11.31'],['12–20','5.42','10.99'],['21–30','5.18','10.50'],
                    ['31–40','4.65','9.43'],['41–70','4.40','8.92'],['71–100','3.90','7.91'],
                    ['101–500','3.49','7.08'],['501–1000','2.50','5.07'],['1001+','2.25','4.56'],
                  ].map(([w, u, b]) => (
                    <tr key={w} className="hover:bg-brand-navy/5 transition-colors">
                      <td className="px-6 py-3 text-gray-700 font-medium">{w}</td>
                      <td className="px-6 py-3 text-right text-gray-700">$ {u}</td>
                      <td className="px-6 py-3 text-right text-brand-navy font-semibold">$ {b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Handling Charge',            value: 'BBD $10.00' },
                { label: 'Brokerage Fee (Personal)',   value: 'BBD $35.00 + VAT' },
                { label: 'Brokerage Fee (Commercial)', value: 'BBD $35.00 + VAT' },
                { label: 'Foreign Exchange Surcharge', value: '2% on freight charges' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white border border-gray-200 rounded-xl px-6 py-4 flex items-center justify-between shadow-sm">
                  <span className="text-gray-600 text-sm">{label}</span>
                  <span className="text-brand-navy font-semibold text-sm">{value}</span>
                </div>
              ))}
              <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 shadow-sm">
                <h4 className="text-gray-900 font-semibold mb-2">Duties &amp; Taxes</h4>
                <p className="text-gray-500 text-sm leading-relaxed">
                  If your purchases total <strong className="text-gray-800">USD $30.00 or less</strong>, customs duties do not apply.
                  Above USD $30.00, duties are determined by the Barbados Customs Authority based on item type.
                </p>
              </div>
              <div className="bg-brand-gold rounded-xl px-6 py-5 text-center">
                <p className="text-brand-navy text-sm font-medium mb-3">Ready to start shipping?</p>
                <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-brand-gold bg-brand-navy rounded-lg hover:bg-brand-navy-dark transition-colors">
                  Open Your Account <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-[#1141be] font-semibold text-sm uppercase tracking-widest mb-3">Get In Touch</p>
            <h2 className="text-3xl sm:text-[44px] font-bold text-gray-800">Contact Us</h2>
            <p className="mt-4 text-gray-500 text-sm">We're here to help you ship smarter.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: MapPin, label: 'Address',       detail: 'Suite #1 Ficus Court Brighton,\nSt. Michael, Barbados', href: undefined },
              { icon: Phone,  label: 'Phone Number',  detail: '+1246-537-2826',             href: 'tel:+12465372826' },
              { icon: Mail,   label: 'Email Address', detail: 'info@cargolinkbarbados.com', href: 'mailto:info@cargolinkbarbados.com' },
            ].map(({ icon: Icon, label, detail, href }) => (
              <div key={label} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-brand-navy flex items-center justify-center mb-4 shadow">
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
                  { label: 'Home',              href: '#hero',    to: undefined },
                  { label: 'About Us',          href: '#about',   to: undefined },
                  { label: 'Rates',             href: '#rates',   to: undefined },
                  { label: 'Contact Us',        href: '#contact', to: undefined },
                  { label: 'Legal',             href: '#',        to: undefined },
                  { label: 'Terms & Condition', href: '#',        to: undefined },
                ].map(({ label, href, to }) => (
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
