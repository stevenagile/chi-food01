import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import MenuPage from "./pages/MenuPage";
import OrderStatusPage from "./pages/OrderStatusPage";
import AdminPage from "./pages/AdminPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import InventoryPage from "./pages/InventoryPage";
import POSPage from "./pages/POSPage";
import KDSPage from "./pages/KDSPage";
import ManualPage from "./pages/ManualPage";
import TableQRPage from "./pages/TableQRPage";
import AccountingPage from "./pages/AccountingPage";
import ReportsPage from "./pages/ReportsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/order-status/:orderId" element={<OrderStatusPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
            <Route path="/admin/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
            <Route path="/admin/stock" element={<Navigate to="/admin/inventory" replace />} />
            <Route path="/admin/pos" element={<ProtectedRoute><POSPage /></ProtectedRoute>} />
            <Route path="/admin/kds" element={<ProtectedRoute><KDSPage /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="/admin/qr-codes" element={<ProtectedRoute><TableQRPage /></ProtectedRoute>} />
            <Route path="/admin/manual" element={<ProtectedRoute><ManualPage /></ProtectedRoute>} />
            <Route path="/admin/accounting" element={<ProtectedRoute><AccountingPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
