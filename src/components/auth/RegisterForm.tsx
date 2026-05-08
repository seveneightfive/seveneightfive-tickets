'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function RegisterForm() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      alert(error.message)
      return
    }

    alert('Check your email to confirm your account.')

    router.push('/login')
  }

  return (
    <form
      onSubmit={handleRegister}
      className="w-full max-w-md p-6 bg-white rounded-xl shadow"
    >
      <h1 className="text-2xl font-bold mb-6">Create Account</h1>

      <input
        type="email"
        placeholder="Email"
        className="w-full border p-3 rounded mb-4"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        className="w-full border p-3 rounded mb-4"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        type="submit"
        className="w-full bg-black text-white p-3 rounded"
      >
        Register
      </button>
    </form>
  )
}
