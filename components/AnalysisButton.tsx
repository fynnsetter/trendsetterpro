'use client'

import { useState } from 'react'
import AnalysisModal from '@/components/AnalysisModal'

interface AnalysisButtonProps {
  ticker: string
  shares: number
  avgPrice: number
}

export default function AnalysisButton({ ticker, shares, avgPrice }: AnalysisButtonProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-3 py-1.5 bg-[#d8bb6b]/10 text-[#d8bb6b] text-xs font-medium rounded-lg hover:bg-[#d8bb6b]/20 transition-all border border-[#d8bb6b]/20 hover:border-[#d8bb6b]/40"
      >
        Analyze
      </button>

      {showModal && (
        <AnalysisModal
          ticker={ticker}
          shares={shares}
          avgPrice={avgPrice}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}