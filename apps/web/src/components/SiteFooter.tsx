import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, CheckCircle } from 'lucide-react'

const LINKS: { label: string; to: string }[] = [
  { label: 'Home',          to: '/'              },
  { label: 'Air Freight',   to: '/air-freight'   },
  { label: 'Ocean Freight', to: '/ocean-freight' },
  { label: 'Rates',         to: '/rates'         },
  { label: 'Contact Us',    to: '/#contact'      },
]

const CONTACT: { Icon: typeof MapPin; text: string; href?: string }[] = [
  { Icon: MapPin, text: 'Suite #1 Ficus Court Brighton,\nSt. Michael, Barbados' },
  { Icon: Mail,   text: 'info@cargolinkbarbados.com', href: 'mailto:info@cargolinkbarbados.com' },
  { Icon: Phone,  text: '+1-246-537-2826',            href: 'tel:+12465372826' },
]

export function SiteFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10 items-start">
          <div>
            <img src="/logos/logo-cropped.png" alt="CargoLink Barbados" className="h-16 w-auto mb-3" />
            <p className="text-sm text-gray-500">Caribbean Trading and Cargo Management Inc.</p>
          </div>
          <div>
            <h5 className="text-gray-900 font-bold text-base mb-4">Quick Links</h5>
            <ul className="space-y-2 text-sm text-gray-500">
              {LINKS.map(({ label, to }) => (
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
              {CONTACT.map(({ Icon, text, href }, i) => {
                const content = (
                  <>
                    <div className="w-9 h-9 bg-brand-navy rounded-full flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-sm text-gray-500 whitespace-pre-line leading-tight">{text}</p>
                  </>
                )
                return href ? (
                  <a key={i} href={href} className="flex items-center gap-3 hover:text-brand-navy transition-colors">
                    {content}
                  </a>
                ) : (
                  <div key={i} className="flex items-center gap-3">{content}</div>
                )
              })}
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
          <p>Copyright © 2026 Caribbean Trading and Cargo Management Inc. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  )
}
