import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import BuyerDashboard from './pages/BuyerDashboard'
import SellerDashboard from './pages/SellerDashboard'
import Search from './pages/Search'
import Negotiation from './pages/Negotiation'
import Payment from './pages/Payment'
import NoAgreement from './pages/NoAgreement'
import NotFound from './pages/NotFound'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/search" replace />} />
          <Route path="search" element={<Search />} />
          <Route path="buyer" element={<BuyerDashboard />} />
          <Route path="seller" element={<SellerDashboard />} />
          <Route path="negotiations/:id" element={<Negotiation />} />
          <Route path="negotiations/:id/pay" element={<Payment />} />
          <Route path="negotiations/:id/no-agreement" element={<NoAgreement />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
