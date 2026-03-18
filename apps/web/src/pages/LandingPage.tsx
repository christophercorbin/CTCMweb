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

// All images sourced from model site (same images user uploaded)
const BASE = 'https://shinebarbados.maktechinstitute.com/wp-content/uploads/2026/03'
const IMG = {
  hero:           `${BASE}/cargo-plane-sunset_23-2151989556.jpg`,
  containers:     `${BASE}/shipping-cargo-containers-businesses-services-import-export-international-transportation_44353-4871.jpg`,
  airFreightBig:  `${BASE}/large-white-airplane-is-being-loaded-with-cargo_1353625-3484.jpg`,
  airFreightPlan: `${BASE}/ChatGPT-Image-Mar-8_-2026_-10_45_44-PM.png`,
  packages:       `${BASE}/ChatGPT-Image-Mar-8_-2026_-10_45_41-PM.png`,
  iconPlane:      `${BASE}/Airplane_x2C__plane_x2C__flight.png`,
  iconCargo:      `${BASE}/Boxes_x2C__cargo_x2C__delivery_x2C__handcart_x2C__logistics.png`,
  iconWarehouse:  `${BASE}/Boxes_x2C__hangar_x2C__warehouse.png`,
  iconShip:       `${BASE}/cargo_x2C__ship_x2C__cargo_ship_x2C__maritime_transport_x2C__freight.png`,
  iconTruck:      `${BASE}/XMLID_3237_-1.png`,
  iconMoney:      `${BASE}/Bank_x2C__car_x2C__encashment_x2C__service_x2C__transportation_x2C__money.png`,
  iconCourier:    `${BASE}/motorbike_x2C__motorcycle_x2C__scooter_x2C__delivery_x2C__shipping_x2C__courier.png`,
}

export function LandingPage() {
  const [mobileOpen, setMobileOpen]     = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const servicesRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
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

      {/* ── NAVBAR ── */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-24">

            {/* Logo — large, shows full stacked mark + tagline */}
            <a href="#hero" className="shrink-0">
              <img
                src="/logos/logo-color-stacked.png"
                alt="CargoLink Barbados — The Smarter way to ship"
                className="h-20 w-auto"
              />
            </a>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-gray-700">
              <a href="#hero" className="hover:text-brand-navy transition-colors border-b-2 border-brand-navy pb-0.5">
                Home
              </a>

              {/* Our Services dropdown */}
              <div ref={servicesRef} className="relative">
                <button
                  onClick={() => setServicesOpen(!servicesOpen)}
                  className="flex items-center gap-1 hover:text-brand-navy transition-colors focus:outline-none"
                >
                  Our Services
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${servicesOpen ? 'rotate-180' : ''}`} />
                </button>
                {servicesOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-brand-navy rounded-xl shadow-xl overflow-hidden z-50">
                    <a
                      href="#services"
                      onClick={() => setServicesOpen(false)}
                      className="block px-6 py-4 text-sm text-white hover:bg-white/10 transition-colors border-b border-white/10"
                    >
                      CargoLink Barbados Express Air Freight
                    </a>
                    <a
                      href="#services"
                      onClick={() => setServicesOpen(false)}
                      className="block px-6 py-4 text-sm text-white hover:bg-white/10 transition-colors"
                    >
                      CargoLink Barbados Ocean Freight
                    </a>
                  </div>
                )}
              </div>

              <a href="#rates"   className="hover:text-brand-navy transition-colors">Rates</a>
              <a href="#contact" className="hover:text-brand-navy transition-colors">Contact Us</a>
            </nav>

            {/* Right: Login + Sign Up */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                to="/login"
                className="text-[15px] font-medium text-gray-700 hover:text-brand-navy transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-brand-navy rounded-lg hover:bg-brand-navy-dark transition-colors shadow"
              >
                Sign Up
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg bg-brand-navy text-white"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-1">
            <a href="#hero"     onClick={() => setMobileOpen(false)} className="block py-2.5 text-sm font-medium text-gray-700 hover:text-brand-navy border-b border-gray-50">Home</a>
            <a href="#services" onClick={() => setMobileOpen(false)} className="block py-2.5 text-sm font-medium text-gray-700 hover:text-brand-navy border-b border-gray-50 pl-2">↳ Express Air Freight</a>
            <a href="#services" onClick={() => setMobileOpen(false)} className="block py-2.5 text-sm font-medium text-gray-700 hover:text-brand-navy border-b border-gray-50 pl-2">↳ Ocean Freight</a>
            <a href="#rates"    onClick={() => setMobileOpen(false)} className="block py-2.5 text-sm font-medium text-gray-700 hover:text-brand-navy border-b border-gray-50">Rates</a>
            <a href="#contact"  onClick={() => setMobileOpen(false)} className="block py-2.5 text-sm font-medium text-gray-700 hover:text-brand-navy">Contact Us</a>
            <div className="flex gap-3 pt-3 border-t border-gray-100">
              <Link to="/login"    className="flex-1 text-center py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg">Login</Link>
              <Link to="/register" className="flex-1 text-center py-2.5 text-sm font-semibold text-white bg-brand-navy rounded-lg">Sign Up</Link>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section id="hero" className="relative min-h-[580px] flex items-center justify-center text-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={IMG.hero} alt="Cargo plane at sunset" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-brand-navy/65" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-28">
          <p className="text-brand-gold font-semibold text-lg mb-3 tracking-wide">Smart Shipping To The Caribbean</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
            Welcome To <span className="text-brand-gold">CargoLink</span> Barbados
          </h1>
          <p className="text-white/80 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
            CargoLink Barbados provides a complete logistics solution including freight forwarding,
            customs clearance, package consolidation, and door-to-door delivery.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#contact" className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-brand-navy rounded-lg hover:bg-brand-navy-dark transition-all shadow-lg border-2 border-white/20">
              Contact Us
            </a>
            <Link to="/register" className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-brand-navy bg-brand-gold rounded-lg hover:bg-brand-gold-dark transition-all shadow-lg">
              Create Free Account <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── THREE SERVICE CARDS ── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { img: IMG.iconPlane,     title: 'Global Freight Solutions',  desc: 'We provide reliable international freight solutions to move your cargo safely and efficiently across global routes and Caribbean destinations.' },
              { img: IMG.iconTruck,     title: 'Cargo Transportation',      desc: 'Our transportation services ensure secure and timely movement of goods, handling everything from small packages to large shipments.' },
              { img: IMG.iconWarehouse, title: 'Warehouse & Storage',        desc: 'Over 33,000 sq ft of warehouse space in Medley, Florida. We handle dry goods, heavy equipment, vehicles, and temperature-controlled cargo.' },
            ].map(({ img, title, desc }) => (
              <div key={title} className="bg-white border border-gray-200 rounded-xl p-8">
                <img src={img} alt={title} className="w-16 h-16 object-contain mb-5" />
                <h3 className="text-lg font-bold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            {/* Photo */}
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <img src={IMG.packages} alt="CargoLink Barbados packages and operations" className="w-full h-[460px] object-cover" />
            </div>
            {/* Text */}
            <div>
              <p className="text-brand-navy font-semibold text-sm uppercase tracking-widest mb-2">Who We Are</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Your Trusted <span className="text-brand-navy">Caribbean Shipping Partner</span>
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                CargoLink Barbados is owned by <strong>Caribbean Trading and Cargo Management Inc.</strong>,
                a Barbadian company established in 2017.
              </p>
              <p className="text-gray-600 leading-relaxed mb-8">
                Our management has over 25 years of experience in international shipping specialising in
                Air freight and Ocean freight logistics into the Caribbean.
              </p>

              {/* Feature list with icon images */}
              <div className="space-y-4 mb-8">
                {[
                  { img: IMG.iconMoney,    title: 'Affordable Cost',       desc: 'Competitive rates calculated by actual or volumetric weight — no hidden fees.' },
                  { img: IMG.iconCourier,  title: 'Short Time Delivery',   desc: 'Weekly sailings and flights from Miami on a reliable, predictable schedule.' },
                  { img: IMG.iconCargo,    title: 'Package Consolidation', desc: 'Bundle multiple purchases into one shipment to reduce costs.' },
                  { img: IMG.iconShip,     title: 'Full Customs Clearance', desc: 'We handle all customs documentation, brokerage, and duties on your behalf.' },
                ].map(({ img, title, desc }) => (
                  <div key={title} className="flex items-start gap-4">
                    <img src={img} alt={title} className="w-10 h-10 object-contain shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-0.5">{title}</h4>
                      <p className="text-sm text-gray-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-brand-navy bg-brand-gold rounded-lg hover:bg-brand-gold-dark transition-colors shadow">
                Open Your Account <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-brand-navy font-semibold text-sm uppercase tracking-widest mb-2">What We Do</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Our Shipping Services</h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto text-sm">
              Reliable air and ocean freight solutions designed to move your cargo safely and efficiently to the Caribbean.
            </p>
          </div>

          {/* Air Freight panel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden shadow-lg mb-8">
            <div className="relative">
              <img src={IMG.airFreightPlan} alt="CargoLink Barbados air freight" className="w-full h-72 lg:h-full object-cover" />
              <div className="absolute inset-0 bg-brand-navy/20" />
            </div>
            <div className="bg-[#fdf9ee] p-10 flex flex-col justify-center">
              <img src={IMG.iconPlane} alt="Air Freight" className="w-16 h-16 object-contain mb-5" />
              <h3 className="text-2xl font-bold text-gray-900 uppercase tracking-wide mb-4">Air Freight</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Weekly service from Miami. A complete door to door service that includes freight,
                brokerage, customs clearance and delivery.
              </p>
              <div className="bg-brand-navy/10 rounded-lg px-4 py-3 text-sm text-brand-navy font-medium inline-block w-fit">
                📅 Cargo must arrive by <strong>noon Thursday</strong> for Friday shipment
              </div>
            </div>
          </div>

          {/* Ocean Freight panel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden shadow-lg">
            <div className="bg-brand-navy p-10 flex flex-col justify-center order-2 lg:order-1">
              <img src={IMG.iconShip} alt="Ocean Freight" className="w-16 h-16 object-contain mb-5 invert brightness-0 invert" />
              <h3 className="text-2xl font-bold text-white uppercase tracking-wide mb-4">Ocean Freight</h3>
              <p className="text-white/70 leading-relaxed mb-6">
                CARGOLINK BARBADOS offers LCL &amp; FCL services from the U.S, Canada, Europe,
                the UK, and the Far East to the Caribbean.
              </p>
              <ul className="space-y-2 text-sm text-white/70">
                {['Containers, boxes & barrels', 'Vehicles, tyres & heavy equipment', 'Dry goods, home goods & building materials', 'Temperature-controlled cargo (frozen & chilled)'].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative order-1 lg:order-2">
              <img src={IMG.containers} alt="Ocean freight containers" className="w-full h-72 lg:h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ── OCEAN FREIGHT FULL-WIDTH ── */}
      <section className="relative py-0 overflow-hidden">
        <div className="relative">
          <img src={IMG.containers} alt="Container port" className="w-full h-56 sm:h-72 object-cover object-center" />
          <div className="absolute inset-0 bg-brand-navy/70 flex flex-col items-center justify-center text-center px-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">OCEAN FREIGHT</h2>
            <p className="text-white/70 text-sm sm:text-base max-w-2xl">
              CARGOLINK BARBADOS offers LCL &amp; FCL services from the U.S, Canada, Europe, the UK, and the Far East to the Caribbean.
            </p>
          </div>
        </div>

        {/* Sub-section: Shipping To Barbados */}
        <div className="relative">
          <img src={IMG.containers} alt="Cargo" className="w-full h-auto min-h-[300px] object-cover object-top" style={{ maxHeight: '400px' }} />
          <div className="absolute inset-0 bg-brand-navy/80 flex flex-col items-center justify-center text-center px-4 py-12">
            <img src={IMG.iconShip} alt="Ship" className="w-16 h-16 object-contain mb-4 invert" />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">Shipping To Barbados…That's Easy!</h2>
            <p className="text-white/70 text-sm max-w-2xl mb-2">CargoLink Barbados offers a one stop solution.</p>
            <p className="text-white/60 text-sm max-w-2xl">
              We ship containers, boxes, barrels, dry goods, heavy equipment, vehicles, tires, chemicals, home goods and building materials to Barbados.
            </p>
            <div className="mt-4 pt-4 border-t border-white/20 text-white/50 text-sm max-w-2xl">
              Our warehouse is conveniently located in Medley, Florida. The facility boasts over 33,000 square feet of warehouse space, with 11 overhead doors and a loading ramp.
            </div>
          </div>
        </div>
      </section>

      {/* ── WEEKLY SAILING CTA ── */}
      <section className="relative py-20 text-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={IMG.containers} alt="Port" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-brand-navy/75" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Weekly Sailing From Miami To Barbados.</h2>
          <p className="text-white/70 mb-8">Our Sales Team is here to help</p>
          <a href="#contact" className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-brand-navy bg-brand-gold rounded-lg hover:bg-brand-gold-dark transition-all shadow-lg">
            Request A Quote
          </a>
        </div>
      </section>

      {/* ── AIR FREIGHT FEATURE ── */}
      <section className="py-0">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="relative">
            <img src={IMG.airFreightBig} alt="Cargo plane loading" className="w-full h-80 lg:h-full object-cover" />
            <div className="absolute inset-0 bg-brand-navy/30" />
          </div>
          <div className="bg-[#fdf9ee] p-12 lg:p-16 flex flex-col justify-center">
            <h2 className="text-3xl font-extrabold text-gray-900 uppercase tracking-wide mb-4">AIR FREIGHT</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Weekly service from Miami. This is a complete door to door service that includes freight,
              brokerage, customs clearance and delivery.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { label: 'Years Experience', value: '25+' },
                { label: 'Warehouse Space', value: '33K+ sq ft' },
                { label: 'Shipping Routes', value: 'US, CA, EU, UK' },
                { label: 'Weekly Flights', value: 'Miami → BGI' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="text-2xl font-bold text-brand-navy">{value}</div>
                  <div className="text-xs text-gray-500 mt-1">{label}</div>
                </div>
              ))}
            </div>
            <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-brand-navy bg-brand-gold rounded-lg hover:bg-brand-gold-dark transition-colors shadow w-fit">
              Start Shipping <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-brand-navy font-semibold text-sm uppercase tracking-widest mb-2">Simple Process</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto text-sm">
              Air &amp; Ocean freight logistics into the Caribbean — shop online, then leave the rest to us.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { step: '01', icon: ClipboardList, title: 'Sign Up',            desc: 'Create your free CargoLink Barbados account online in minutes.' },
              { step: '02', icon: MapPin,        title: 'Get Your US Address', desc: 'Once registered you will immediately receive your new US shipping address.' },
              { step: '03', icon: ShoppingCart,  title: 'Shop Online',         desc: 'Shop on Amazon, eBay, AliExpress and more. Ship to your new US address.' },
              { step: '04', icon: Package,        title: 'We Receive & Track',  desc: 'Once your cargo arrives at our Miami warehouse you can track every step.' },
              { step: '05', icon: ClipboardList,  title: 'Clear & Invoice',     desc: 'We process and clear your cargo and advise you of all freight, duties, and fees.' },
              { step: '06', icon: Truck,          title: 'Collect Your Packages', desc: 'Collect your packages from our offices at #1 Ficus Court, Brighton, St. Michael.' },
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
      <section id="rates" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-brand-navy font-semibold text-sm uppercase tracking-widest mb-2">Transparent Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Air Freight Rates</h2>
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
                <div key={label} className="bg-white border border-gray-200 rounded-xl px-6 py-4 flex items-center justify-between">
                  <span className="text-gray-600 text-sm">{label}</span>
                  <span className="text-brand-navy font-semibold text-sm">{value}</span>
                </div>
              ))}
              <div className="bg-white border border-gray-200 rounded-xl px-6 py-5">
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
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-brand-navy font-semibold text-sm uppercase tracking-widest mb-2">Get In Touch</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Contact Us</h2>
            <p className="mt-4 text-gray-500 text-sm">We're here to help you ship smarter.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: MapPin, label: 'Address',       detail: 'Suite #1 Ficus Court Brighton,\nSt. Michael, Barbados', href: undefined },
              { icon: Phone,  label: 'Phone Number',  detail: '+1246-537-2826',              href: 'tel:+12465372826' },
              { icon: Mail,   label: 'Email Address', detail: 'info@cargolinkbarbados.com',  href: 'mailto:info@cargolinkbarbados.com' },
            ].map(({ icon: Icon, label, detail, href }) => (
              <div key={label} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-brand-navy flex items-center justify-center mb-4 shadow">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">{label}</h4>
                {href ? <a href={href} className="text-sm text-brand-navy hover:underline whitespace-pre-line">{detail}</a>
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
              <img src="/logos/logo-color-stacked.png" alt="CargoLink Barbados" className="h-20 w-auto mb-3" />
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
                  { label: 'Home',       href: '#hero',        to: undefined },
                  { label: 'About Us',   href: '#about',       to: undefined },
                  { label: 'Rates',      href: '#rates',       to: undefined },
                  { label: 'Contact Us', href: '#contact',     to: undefined },
                  { label: 'Register',   href: undefined,      to: '/register' },
                  { label: 'Log In',     href: undefined,      to: '/login' },
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
                  { Icon: Phone,  text: '+1246-537-2826' },
                  { Icon: Mail,   text: 'info@cargolinkbarbados.com' },
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
            <p>Copyright © {new Date().getFullYear()} Caribbean Trading and Cargo Management Inc. All Rights Reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
