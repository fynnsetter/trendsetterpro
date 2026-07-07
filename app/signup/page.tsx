'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignUp() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      setTimeout(() => router.push('/'), 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a2332] px-4 relative overflow-hidden">
      
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#d8bb6b]/[0.04] blur-3xl"></div>
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-[#d8bb6b]/[0.06] via-[#d8bb6b]/[0.02] to-transparent blur-2xl"></div>
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#d8bb6b]/[0.03] via-transparent to-transparent blur-2xl"></div>
        <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-[#d8bb6b]/[0.03] via-transparent to-transparent blur-2xl"></div>
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#d8bb6b]/[0.03] via-transparent to-transparent blur-2xl"></div>
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#d8bb6b]/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#d8bb6b]/10 to-transparent"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Logo Section */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold tracking-wide" 
              style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}>
            <span className="text-[#d8bb6b]">TREND</span>
            <span className="text-white">SETTER</span>
          </h1>
          
          <div className="flex items-center justify-center gap-4 mt-4 mb-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#d8bb6b]/30"></div>
            <div className="h-1 w-1 rounded-full bg-[#d8bb6b]/40"></div>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#d8bb6b]/30"></div>
          </div>
          
          <p className="text-gray-300/70 font-light tracking-[0.3em] text-xs uppercase">
            Create Your Account
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm text-center">
            Account created! Redirecting to login...
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignUp}>
          <div className="space-y-5">
            
            {/* Full Name */}
            <div>
              <label className="block text-gray-200/70 font-light text-sm tracking-wide mb-1.5">Full Name</label>
              <input 
                type="text" 
                placeholder="John Doe" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-400/40 
                transition-all duration-300 ease-out
                hover:scale-[1.02] hover:border-white/20
                focus:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#d8bb6b]/60 focus:border-[#d8bb6b]/40 focus:shadow-lg focus:shadow-[#d8bb6b]/10"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-gray-200/70 font-light text-sm tracking-wide mb-1.5">Email</label>
              <input 
                type="email" 
                placeholder="name@domain.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-400/40 
                transition-all duration-300 ease-out
                hover:scale-[1.02] hover:border-white/20
                focus:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#d8bb6b]/60 focus:border-[#d8bb6b]/40 focus:shadow-lg focus:shadow-[#d8bb6b]/10"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-gray-200/70 font-light text-sm tracking-wide mb-1.5">Password</label>
              <input 
                type="password" 
                placeholder="•••••••• (min 6 characters)" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-400/40 
                transition-all duration-300 ease-out
                hover:scale-[1.02] hover:border-white/20
                focus:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#d8bb6b]/60 focus:border-[#d8bb6b]/40 focus:shadow-lg focus:shadow-[#d8bb6b]/10"
                required
                minLength={6}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full mt-8 bg-[#d8bb6b] text-[#1a2332] font-semibold py-3.5 rounded-xl hover:bg-[#c4a45a] transition-all duration-300 text-lg tracking-wide shadow-lg shadow-[#d8bb6b]/10 hover:shadow-[#d8bb6b]/20 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-xs text-gray-400/30 font-light tracking-wide text-center mt-5">
          Already have an account? <Link href="/" className="text-[#d8bb6b] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}