import { Routes, Route, Navigate } from 'react-router-dom';
import PJDashboard from './pj-dashboard';
import PJExtrato from './pj-extrato';
import PJPixEnviar from './pj-pix-enviar';
import PJPixReceber from './pj-pix-receber';
import PJPixChaves from './pj-pix-chaves';
import InvoicesLista from './invoices-lista';
import InvoicesNovo from './invoices-novo';
import InvoicesDetalhe from './invoices-detalhe';
import CartoesLista from './cartoes-lista';
import CartoesFatura from './cartoes-fatura';
import Team from './team';
import Empresa from './empresa';
import PerfilPage from './perfil';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/pj/dashboard" replace />} />
      <Route path="/pj/dashboard" element={<PJDashboard />} />
      <Route path="/pj/extrato" element={<PJExtrato />} />
      <Route path="/pj/pix/enviar" element={<PJPixEnviar />} />
      <Route path="/pj/pix/receber" element={<PJPixReceber />} />
      <Route path="/pj/pix/chaves" element={<PJPixChaves />} />
      <Route path="/pj/cobrancas" element={<InvoicesLista />} />
      <Route path="/pj/cobrancas/nova" element={<InvoicesNovo />} />
      <Route path="/pj/cobrancas/:id" element={<InvoicesDetalhe />} />
      <Route path="/pj/cartoes" element={<CartoesLista />} />
      <Route path="/pj/cartoes/:id/fatura" element={<CartoesFatura />} />
      <Route path="/pj/time" element={<Team />} />
      <Route path="/pj/empresa" element={<Empresa />} />
      <Route path="/pj/perfil" element={<PerfilPage />} />
    </Routes>
  );
}
