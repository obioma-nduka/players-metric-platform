import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

export default function Layout() {
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
