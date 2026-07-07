'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface CashManagerProps {
  userId: string
  onCashUpdate: (balance: number) => void
  refreshTrigger?: boolean
}

export default function CashManager({ userId, onCashUpdate, refreshTrigger }: CashManagerProps) {
  const [balance, setBalance] = useState(0)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal'>('deposit')

  const fetchBalance = async () => {
    const { data, error } = await supabase
      .from('cash')
      .select('amount')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching cash:', error)
      return
    }

    const total = data.reduce((sum, t) => sum + t.amount, 0)
    setBalance(total)
    onCashUpdate(total)
  }

  useEffect(() => {
    fetchBalance()
  }, [userId, refreshTrigger])

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount')
      setLoading(false)
      return
    }

    // 🔒 PREVENT NEGATIVE CASH
    if (transactionType === 'withdrawal' && numAmount > balance) {
      setError(`⚠️ Insufficient funds. You only have £${balance.toFixed(2)} available.`)
      setLoading(false)
      return
    }

    const transactionAmount = transactionType === 'deposit' ? numAmount : -numAmount

    const { error } = await supabase
      .from('cash')
      .insert([
        {
          user_id: userId,
          amount: transactionAmount,
          type: transactionType,
          description: description || `${transactionType} of £${numAmount.toFixed(2)}`,
        },
      ])

    if (error) {
      setError(error.message)
    } else {
      setSuccess(`✅ £${numAmount.toFixed(2)} ${transactionType === 'deposit' ? 'deposited' : 'withdrawn'} successfully!`)
      setAmount('')
      setDescription('')
      await fetchBalance()
      setTimeout(() => setSuccess(''), 3000)
    }

    setLoading(false)
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-gray-400/70 text-sm font-light tracking-wide">💰 Cash Balance</p>
          <p className="text-3xl font-bold text-white mt-1">
            £{balance.toFixed(2)}
          </p>
          {balance < 0 && (
            <p className="text-red-400 text-xs mt-1">⚠️ Negative balance</p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-[#d8bb6b] text-[#1a2332] font-semibold rounded-lg hover:bg-[#c4a45a] transition-all shadow-lg shadow-[#d8bb6b]/20 hover:shadow-[#d8bb6b]/40"
        >
          Manage Cash
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => {
            setTransactionType('deposit')
            setAmount('100')
            setShowModal(true)
          }}
          className="text-xs px-3 py-1 bg-green-500/10 text-green-400 rounded-full hover:bg-green-500/20 transition-all"
        >
          + £100
        </button>
        <button
          onClick={() => {
            setTransactionType('deposit')
            setAmount('500')
            setShowModal(true)
          }}
          className="text-xs px-3 py-1 bg-green-500/10 text-green-400 rounded-full hover:bg-green-500/20 transition-all"
        >
          + £500
        </button>
        <button
          onClick={() => {
            setTransactionType('deposit')
            setAmount('1000')
            setShowModal(true)
          }}
          className="text-xs px-3 py-1 bg-green-500/10 text-green-400 rounded-full hover:bg-green-500/20 transition-all"
        >
          + £1000
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2332] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-light text-white">Manage Cash</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white transition-all text-xl"
              >
                ✕
              </button>
            </div>

            <div className="bg-white/5 rounded-xl p-3 mb-4">
              <p className="text-gray-400/70 text-sm">Current Balance</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-white' : 'text-red-400'}`}>
                £{balance.toFixed(2)}
              </p>
            </div>

            {success && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                {success}
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleTransaction}>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-200/70 font-light text-sm mb-1">Transaction Type</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setTransactionType('deposit')}
                      className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${
                        transactionType === 'deposit'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      💰 Deposit
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransactionType('withdrawal')}
                      className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${
                        transactionType === 'withdrawal'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      💳 Withdraw
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-200/70 font-light text-sm mb-1">Amount (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="100.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder:text-gray-400/40 
                    focus:outline-none focus:ring-2 focus:ring-[#d8bb6b]/60 focus:border-[#d8bb6b]/40"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-200/70 font-light text-sm mb-1">Description (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., Initial deposit, Salary, etc."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder:text-gray-400/40 
                    focus:outline-none focus:ring-2 focus:ring-[#d8bb6b]/60 focus:border-[#d8bb6b]/40"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 rounded-xl font-semibold transition-all ${
                    transactionType === 'deposit'
                      ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20'
                      : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? 'Processing...' : `${transactionType === 'deposit' ? 'Deposit' : 'Withdraw'} £${parseFloat(amount || '0').toFixed(2)}`}
                </button>
              </div>
            </form>

            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-3 py-2 text-gray-400 hover:text-white transition-all text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}