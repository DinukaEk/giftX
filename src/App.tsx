import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { HomePage } from "@/pages/HomePage";
import { AuthPage } from "@/pages/AuthPage";
import { ListingPage } from "@/pages/ListingPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { OrderDetailPage } from "@/pages/OrderDetailPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="auth" element={<AuthPage />} />
        <Route path="listing/:id" element={<ListingPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute requireSeller>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders"
          element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders/:id"
          element={
            <ProtectedRoute>
              <OrderDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
