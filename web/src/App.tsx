import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import BuyerDashboard from './pages/BuyerDashboard'
import SalesHistory from './pages/SalesHistory'
import SellerDashboard from './pages/SellerDashboard'
import Search from './pages/Search'
import Negotiation from './pages/Negotiation'
import Payment from './pages/Payment'
import Proposals from './pages/Proposals'
import NoAgreement from './pages/NoAgreement'
import NotFound from './pages/NotFound'
import HomeRedirect from './role/HomeRedirect'
import RequireRole from './role/RequireRole'
import RoleProvider from './role/RoleProvider'
import './App.css'
import './styles/screens.css'
import './styles/states.css'
import './styles/role.css'
import './styles/cards.css'
import './styles/history.css'

export default function App() {
  return (
    <BrowserRouter>
      <RoleProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomeRedirect />} />
            <Route path="search" element={<Search />} />
            <Route path="buyer" element={<RequireRole role="buyer"><BuyerDashboard /></RequireRole>} />
            <Route path="seller" element={<RequireRole role="seller"><SellerDashboard /></RequireRole>} />
            <Route path="seller/history" element={<RequireRole role="seller"><SalesHistory /></RequireRole>} />
            <Route path="proposals" element={<Proposals />} />
            <Route path="negotiations/:id" element={<Negotiation />} />
            <Route path="negotiations/:id/pay" element={<Payment />} />
            <Route path="negotiations/:id/no-agreement" element={<RequireRole role="buyer"><NoAgreement /></RequireRole>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </RoleProvider>
    </BrowserRouter>
  )
}
