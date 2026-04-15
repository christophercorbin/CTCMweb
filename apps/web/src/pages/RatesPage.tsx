import { useState } from 'react'
import { SiteNav } from '../components/SiteNav'
import { SiteFooter } from '../components/SiteFooter'

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
  const [selectedRate, setSelectedRate] = useState(RATES[0])
  const [weight, setWeight]             = useState('')
  const estimated    = weight ? (selectedRate.usd * parseFloat(weight)).toFixed(2) : ''
  const estimatedBBD = weight ? (selectedRate.bbd * parseFloat(weight)).toFixed(2) : ''

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      <SiteNav />

      {/* ── HERO ── */}
      <section className="relative min-h-[360px] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src="/images/hero-bg.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-brand-navy/75" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-brand-gold font-semibold text-sm uppercase tracking-widest mb-3">Our Services</p>
          <h1 className="text-4xl sm:text-[52px] font-bold text-white leading-tight mb-4">
            Rates
          </h1>
          <p className="text-white/80 text-base max-w-xl leading-relaxed">
            Transparent pricing for air &amp; ocean freight from Miami to Barbados.
            Charges are calculated on the higher of actual or volumetric weight.
          </p>
        </div>
      </section>

      {/* ── RATE CALCULATOR ── */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-[#1141be] font-semibold text-sm uppercase tracking-widest mb-3">Freight Estimator</p>
            <h2 className="text-3xl sm:text-[44px] font-bold text-gray-800">Rate calculator</h2>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 shadow-sm border border-gray-200 max-w-2xl mx-auto">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Weight tier</label>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Estimated (USD)</label>
                  <input
                    readOnly
                    value={estimated ? `$${estimated}` : ''}
                    placeholder="$0.00"
                    className="w-full px-4 py-3 rounded-full border border-gray-200 text-base bg-gray-100 text-brand-navy font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Estimated (BBD)</label>
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

      {/* ── ADDITIONAL FEES ── */}
      <section className="py-16 bg-gray-50 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-[#1141be] font-semibold text-sm uppercase tracking-widest mb-3">Other Charges</p>
            <h2 className="text-3xl sm:text-[44px] font-bold text-gray-800">Additional fees</h2>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Handling Charge',                             value: 'BBD $10.00' },
              { label: 'Brokerage Fee — Personal (where applicable)', value: 'BBD $35.00 + VAT' },
              { label: 'Brokerage Fee — Commercial Brokerage',        value: 'BBD $35.00 + VAT' },
              { label: 'Foreign Exchange Surcharge',                  value: '2% on the freight charges' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-6 py-4">
                <span className="text-gray-700 text-sm font-medium">{label}</span>
                <span className="text-brand-navy font-bold text-sm">{value}</span>
              </div>
            ))}

            {/* Duties & Taxes */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-5 mt-6">
              <h4 className="font-bold text-gray-800 mb-2">Duties &amp; Taxes</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                If you purchase an item(s) and the total value is <strong>$75 USD or less</strong>, customs duties are not applicable.
              </p>
              <p className="text-gray-600 text-sm leading-relaxed mt-2">
                If the total value exceeds $75 USD, duties are applied. Items attract different rates of duty
                as determined by the Barbados Customs Authority. Our Duty Calculator gives you a guide for most common items.
              </p>
            </div>

            {/* Duty Calculator CTA */}
            <div className="bg-brand-navy rounded-xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-white text-base mb-1">Barbados Customs Duty Calculator</h4>
                <p className="text-white/70 text-sm">Estimate the duties and taxes on your items before you ship.</p>
              </div>
              <a
                href="https://asycuda.customs.gov.bb/portal/services/dutyCalculator/calculateDuties.jsf"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-brand-navy bg-brand-gold rounded-lg hover:opacity-90 transition-all shadow whitespace-nowrap"
              >
                Open Calculator →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── RATES TABLE ── */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <p className="text-[#1141be] font-semibold text-sm uppercase tracking-widest mb-3">Freight Rates</p>
            <h2 className="text-3xl sm:text-[44px] font-bold text-gray-800">Rate schedule</h2>
            <p className="mt-3 text-gray-500 text-sm">Per-pound pricing by weight tier.</p>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200">
            <div className="grid grid-cols-3 bg-brand-navy text-white">
              {['Weight (lb)', 'Cost per lb (USD)', 'Cost per lb (BBD)'].map(h => (
                <div key={h} className="px-6 py-4 text-center font-bold text-sm">{h}</div>
              ))}
            </div>
            {RATES.map((r, i) => (
              <div key={r.weight} className={`grid grid-cols-3 border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-brand-navy/5 transition-colors`}>
                <div className="px-6 py-5 text-center font-semibold text-gray-800 text-base">{r.weight}</div>
                <div className="px-6 py-5 text-center text-gray-700 text-base">$ {r.usd.toFixed(2)}</div>
                <div className="px-6 py-5 text-center text-brand-navy font-bold text-base">$ {r.bbd.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INSURANCE RATES ── */}
      <section className="py-16 bg-gray-50 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <p className="text-[#1141be] font-semibold text-sm uppercase tracking-widest mb-3">Cargo Protection</p>
            <h2 className="text-3xl sm:text-[44px] font-bold text-gray-800">Coverage insurance rates</h2>
            <p className="mt-3 text-gray-500 text-sm max-w-xl mx-auto">
              Rates are per USD$100 of insurance coverage. Insurance covers the total invoice value of your cargo.
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-white">
            <div className="grid grid-cols-2 bg-brand-navy text-white">
              <div className="px-6 py-4 font-bold text-sm">Commodity Category</div>
              <div className="px-6 py-4 font-bold text-sm text-right">USD per $100</div>
            </div>
            {INSURANCE.map((ins, i) => (
              <div key={ins.category} className={`grid grid-cols-2 border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-brand-navy/5 transition-colors`}>
                <div className="px-6 py-4 text-gray-700 text-base">{ins.category}</div>
                <div className="px-6 py-4 text-brand-navy font-bold text-base text-right">{ins.rate.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />

    </div>
  )
}
