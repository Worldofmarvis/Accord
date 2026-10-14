import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import BuyerDashboard from './pages/BuyerDashboard'
import SellerDashboard from './pages/SellerDashboard'
import Search from './pages/Search'
import Negotiation from './pages/Negotiation'
import Payment from './pages/Payment'
import NoAgreement from './pages/NoAgreement'
import NotFound from './pages/NotFound'
import RequireRole from './role/RequireRole'
import RoleProvider from './role/RoleProvider'
import './App.css'
import './styles/screens.css'
import './styles/states.css'
import './styles/role.css'

export default function App() {
  return (
    <BrowserRouter>
      <RoleProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/search" replace />} />
            <Route path="search" element={<Search />} />
            <Route path="buyer" element={<RequireRole role="buyer"><BuyerDashboard /></RequireRole>} />
            <Route path="seller" element={<RequireRole role="seller"><SellerDashboard /></RequireRole>} />
            <Route path="negotiations/:id" element={<Negotiation />} />
            <Route path="negotiations/:id/pay" element={<Payment />} />
            <Route path="negotiations/:id/no-agreement" element={<NoAgreement />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </RoleProvider>
    </BrowserRouter>
  )
}
