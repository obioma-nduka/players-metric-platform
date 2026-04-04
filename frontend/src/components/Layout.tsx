import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '@/context/AuthContext'
import Navbar from './Navbar'
import Footer from './Footer'

export default function Layout() {
  const token = useAuthStore((s) => s.token)
  const refreshMe = useAuthStore((s) => s.refreshMe)

  useEffect(() => {
    if (token) void refreshMe()
  }, [token, refreshMe])

  return (
    <div className="platform-layout">
      <Navbar />
      <main className="platform-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
