import { Link } from 'react-router-dom'
import logo from '@/assets/logo.svg'

export function Logo({ to = '/' }) {
  return (
    <Link to={to} className="shrink-0 rounded-[14px] focus-visible:ring-3 focus-visible:ring-ring/50 outline-none">
      <img src={logo} width={40} height={40} alt="Inspiration Board" />
    </Link>
  )
}
