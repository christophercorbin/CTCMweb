import { Link } from 'react-router-dom'
import {
  Plane,
  Ship,
  Warehouse,
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
  ArrowRight,
  Star,
} from 'lucide-react'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── NAVBAR ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a href="#hero">
              <img
                src="/logos/logo-color-horizontal.png"
                alt="CargoLink Barbados"
                className="h-9 w-auto"
              />
            </a>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
              <a href="#services"     className="hover:text-brand-navy transition-colors">Services</a>
              <a href="#how-it-works" className="hover:text-brand-navy transition-colors">How It Works</a>
              <a href="#about"        className="hover:text-brand-navy transition-colors">About Us</a>
              <a href="#rates"        className="hover:text-brand-navy transition-colors">Rates</a>
              <a href="#contact"      className="hover:text-brand-navy transition-colors">Contact</a>
            </nav>

            {/* CTAs */}
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-brand-navy border border-brand-navy rounded-lg hover:bg-brand-navy hover:text-white transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-brand-navy bg-brand-gold rounded-lg hover:bg-brand-gold-dark transition-colors shadow"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section
        id="hero"
        className="pt-16 min-h-screen flex items-center bg-brand-gradient relative overflow-hidden"
      >
        {/* Subtle glow blobs */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-20 right-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-brand-navy-light rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
          <div className="max-w-3xl">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-brand-gold bg-white/10 rounded-full tracking-widest uppercase mb-6 border border-white/20">
              The Smarter Way to Ship
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
              Smart Shipping<br />
              <span className="text-brand-gold">to the Caribbean</span>
            </h1>
            <p className="text-lg text-white/80 mb-10 max-w-xl leading-relaxed">
              CargoLink Barbados provides a complete logistics solution — freight forwarding, customs clearance,
              package consolidation, and door-to-door delivery. Shop online and leave the rest to us.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-brand-navy bg-brand-gold rounded-xl hover:bg-brand-gold-dark transition-all shadow-lg"
              >
                Create Free Account
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white border-2 border-white/40 rounded-xl hover:bg-white/10 transition-all"
              >
                Log In to Portal
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap gap-6 text-white/70 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-brand-gold" />
                <span>Weekly Miami → Barbados flights</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-brand-gold" />
                <span>25+ years experience</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-brand-gold" />
                <span>Real-time tracking</span>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 80L1440 80L1440 20C1200 70 900 0 720 30C540 60 240 10 0 50L0 80Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-brand-navy uppercase tracking-widest">What We Do</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">Our Shipping Services</h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto">
              Reliable air and ocean freight solutions designed to move your cargo safely and efficiently to the Caribbean.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Plane,
                title: 'Air Freight',
                desc: 'Fast and reliable weekly air freight service from Miami to Barbados. A complete door-to-door service including freight, brokerage, customs clearance, and delivery.',
                tag: 'Weekly Miami → Barbados',
              },
              {
                icon: Ship,
                title: 'Ocean Freight',
                desc: 'Cost-effective LCL & FCL ocean freight shipping from the U.S., Canada, Europe, the UK, and the Far East to the Caribbean. Containers, barrels, vehicles, and more.',
                tag: 'LCL & FCL Available',
              },
              {
                icon: Warehouse,
                title: 'Warehouse & Cargo Handling',
                desc: 'Our Medley, Florida warehouse offers over 33,000 sq ft of storage. We handle dry goods, heavy equipment, vehicles, and temperature-controlled cargo.',
                tag: '33,000+ sq ft — Medley, FL',
              },
            ].map(({ icon: Icon, title, desc, tag }) => (
              <div
                key={title}
                className="group bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-14 h-14 bg-brand-navy/5 rounded-xl flex items-center justify-center mb-6 group-hover:bg-brand-navy transition-colors">
                  <Icon className="w-7 h-7 text-brand-navy group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-500 leading-relaxed mb-6">{desc}</p>
                <span className="text-xs text-brand-navy font-semibold uppercase tracking-wide bg-brand-navy/5 rounded-lg px-3 py-2 inline-block">
                  {tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-brand-navy uppercase tracking-widest">Simple Process</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto">
              Air freight and Ocean freight logistics into the Caribbean — shop, consolidate, then leave the rest to us.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                step: '01', icon: ClipboardList, title: 'Sign Up',
                desc: 'Create your free CargoLink Barbados account online in minutes.',
              },
              {
                step: '02', icon: MapPin, title: 'Get Your US Address',
                desc: 'Once registered you will immediately receive your new US shipping address.',
              },
              {
                step: '03', icon: ShoppingCart, title: 'Shop Online',
                desc: 'Shop on Amazon, eBay, AliExpress and more. Ship your orders to your new US address. Check our restricted items list before purchasing.',
              },
              {
                step: '04', icon: Package, title: 'We Receive & Track',
                desc: 'Once your cargo arrives at our Miami warehouse you can track and monitor every step of the way.',
              },
              {
                step: '05', icon: ClipboardList, title: 'Clear & Invoice',
                desc: 'We process and clear your cargo and advise you of all airfreight, duties, and brokerage fees.',
              },
              {
                step: '06', icon: Truck, title: 'Collect Your Packages',
                desc: 'Collect your packages from our offices at #1 Ficus Court, Brighton, St. Michael.',
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                <div className="absolute top-6 right-6 text-5xl font-black text-gray-50 select-none leading-none">
                  {step}
                </div>
                <div className="w-12 h-12 bg-brand-navy rounded-xl flex items-center justify-center mb-5 shadow">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
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

      {/* ── ABOUT ── */}
      <section id="about" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left: content */}
            <div>
              <span className="text-sm font-semibold text-brand-navy uppercase tracking-widest">Who We Are</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Your Trusted Caribbean Shipping Partner
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                CargoLink Barbados is owned by <strong>Caribbean Trading and Cargo Management Inc.</strong>, a Barbadian
                company established in 2017. Our management has over 25 years of experience in international shipping,
                specialising in Air freight and Ocean freight logistics into the Caribbean.
              </p>
              <p className="text-gray-600 leading-relaxed mb-8">
                The service is a safe and convenient way to enjoy the large selection of goods available in the U.S.
                marketplace right from your computer. Save time and money by shipping online purchases from sites like
                Amazon, AliExpress, and eBay with CargoLink Barbados.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { label: 'Years Experience', value: '25+' },
                  { label: 'Warehouse Space', value: '33K+ sq ft' },
                  { label: 'Shipping Routes', value: 'US, CA, EU, UK' },
                  { label: 'Weekly Flights', value: 'Miami → BGI' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-brand-navy/5 rounded-xl p-4">
                    <div className="text-2xl font-bold text-brand-navy">{value}</div>
                    <div className="text-sm text-gray-500 mt-1">{label}</div>
                  </div>
                ))}
              </div>

              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-brand-navy bg-brand-gold rounded-xl hover:bg-brand-gold-dark transition-colors shadow"
              >
                Open Your Account
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Right: feature list */}
            <div className="space-y-4">
              {[
                {
                  icon: CheckCircle, title: 'Affordable Cost',
                  desc: 'Competitive rates calculated by actual or volumetric weight — whichever is higher. No hidden fees.',
                },
                {
                  icon: Truck, title: 'Short Time Delivery',
                  desc: 'Weekly sailings and flights from Miami ensure your cargo arrives on a reliable, predictable schedule.',
                },
                {
                  icon: Package, title: 'Package Consolidation',
                  desc: 'Bundle multiple purchases into one shipment to reduce costs and simplify your deliveries.',
                },
                {
                  icon: Star, title: 'Full Customs Clearance',
                  desc: 'We handle all customs documentation, brokerage, and duties on your behalf — hassle free.',
                },
                {
                  icon: MapPin, title: 'Real-Time Tracking',
                  desc: 'Monitor your shipment status every step of the way through the CargoLink portal.',
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex gap-4 p-5 rounded-xl border border-gray-100 hover:border-brand-navy/20 hover:bg-brand-navy/5 transition-colors"
                >
                  <div className="w-10 h-10 bg-brand-navy/10 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-brand-navy" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
                    <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── RATES ── */}
      <section id="rates" className="py-24 bg-brand-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-brand-gold uppercase tracking-widest">Transparent Pricing</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-white">Air Freight Rates</h2>
            <p className="mt-4 text-white/60 max-w-xl mx-auto text-sm">
              Charges are calculated according to the higher of actual or volumetric weight. All rates are per pound.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Rate table */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 bg-brand-navy-dark">
                <h3 className="text-white font-semibold text-sm uppercase tracking-wide">
                  Miami Shipping Rate — Cost Per Lb
                </h3>
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
                    ['1',        '8.45', '17.33'],
                    ['2',        '7.31', '14.82'],
                    ['3',        '7.07', '14.35'],
                    ['4',        '6.01', '12.81'],
                    ['5',        '5.80', '11.76'],
                    ['6–11',     '5.58', '11.31'],
                    ['12–20',    '5.42', '10.99'],
                    ['21–30',    '5.18', '10.50'],
                    ['31–40',    '4.65', '9.43'],
                    ['41–70',    '4.40', '8.92'],
                    ['71–100',   '3.90', '7.91'],
                    ['101–500',  '3.49', '7.08'],
                    ['501–1000', '2.50', '5.07'],
                    ['1001+',    '2.25', '4.56'],
                  ].map(([weight, usd, bbd]) => (
                    <tr key={weight} className="hover:bg-brand-navy/5 transition-colors">
                      <td className="px-6 py-3 text-gray-700 font-medium">{weight}</td>
                      <td className="px-6 py-3 text-right text-gray-700">$ {usd}</td>
                      <td className="px-6 py-3 text-right text-brand-navy font-semibold">$ {bbd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Additional fees + CTA */}
            <div className="space-y-4">
              {[
                { label: 'Handling Charge',             value: 'BBD $10.00' },
                { label: 'Brokerage Fee (Personal)',    value: 'BBD $35.00 + VAT' },
                { label: 'Brokerage Fee (Commercial)',  value: 'BBD $35.00 + VAT' },
                { label: 'Foreign Exchange Surcharge',  value: '2% on freight charges' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-white/10 backdrop-blur rounded-xl px-6 py-4 flex items-center justify-between"
                >
                  <span className="text-white/70 text-sm">{label}</span>
                  <span className="text-brand-gold font-semibold text-sm">{value}</span>
                </div>
              ))}

              <div className="bg-white/10 backdrop-blur rounded-xl px-6 py-5 mt-2">
                <h4 className="text-white font-semibold mb-3">Duties &amp; Taxes</h4>
                <p className="text-white/60 text-sm leading-relaxed">
                  If your purchase(s) total <strong className="text-white">USD $30.00 or less</strong>, customs duties
                  do not apply. Above USD $30.00, duties are determined by the Barbados Customs Authority based on
                  item type.
                </p>
              </div>

              <div className="bg-brand-gold rounded-xl px-6 py-5 text-center mt-2">
                <p className="text-brand-navy text-sm font-medium mb-3">Ready to start shipping?</p>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-brand-gold bg-brand-navy rounded-xl hover:bg-brand-navy-dark transition-colors"
                >
                  Open Your Account
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-brand-navy uppercase tracking-widest">Get In Touch</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">Contact Us</h2>
            <p className="mt-4 text-gray-500">We're here to help you ship smarter.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-brand-navy/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 text-brand-navy" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Phone</h4>
              <a href="tel:+12465372826" className="text-brand-navy hover:underline text-sm font-medium">
                +1 246-537-2826
              </a>
              <p className="text-xs text-gray-400 mt-2">Mon – Fri, 9:30am – 4:30pm</p>
            </div>

            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-brand-navy/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-brand-navy" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Email</h4>
              <a href="mailto:info@cargolinkbarbados.com" className="text-brand-navy hover:underline text-sm font-medium break-all">
                info@cargolinkbarbados.com
              </a>
            </div>

            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-brand-navy/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6 text-brand-navy" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Address</h4>
              <p className="text-sm text-gray-500 leading-relaxed">
                Suite #1 Ficus Court<br />Brighton, St. Michael<br />Barbados
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-brand-navy text-white/60 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">

            {/* Brand */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-lg px-3 py-2 inline-block mb-4">
                <img
                  src="/logos/logo-color-horizontal.png"
                  alt="CargoLink Barbados"
                  className="h-8 w-auto"
                />
              </div>
              <p className="text-sm text-white/50 leading-relaxed max-w-xs">
                Caribbean Trading and Cargo Management Inc. — your trusted freight forwarding partner since 2017.
              </p>
              <div className="flex gap-3 mt-5">
                {[Facebook, Instagram, Twitter, Linkedin].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-brand-gold hover:text-brand-navy transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Services */}
            <div>
              <h5 className="text-white font-semibold text-sm mb-4 uppercase tracking-wide">Services</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="#services" className="hover:text-white transition-colors">Air Freight</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Ocean Freight</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Warehouse &amp; Storage</a></li>
                <li><a href="#rates"    className="hover:text-white transition-colors">Rates</a></li>
              </ul>
            </div>

            {/* Account */}
            <div>
              <h5 className="text-white font-semibold text-sm mb-4 uppercase tracking-wide">Account</h5>
              <ul className="space-y-2 text-sm">
                <li><Link to="/register"  className="hover:text-white transition-colors">Register</Link></li>
                <li><Link to="/login"     className="hover:text-white transition-colors">Log In</Link></li>
                <li><a href="#contact"    className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/30">
            <p>© {new Date().getFullYear()} Caribbean Trading and Cargo Management Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms &amp; Conditions</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
