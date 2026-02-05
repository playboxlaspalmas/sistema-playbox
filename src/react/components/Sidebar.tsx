import { useEffect } from "react";
import type { User } from "@/types";
import { canAccessSection } from "@/lib/permissions";

export type DashboardSection = 
  | "dashboard" 
  | "new-order" 
  | "orders" 
  | "customers"
  | "branches"
  | "users"
  | "reports"
  | "settings"
  | "security"
  | "pos"
  | "productos-stock"
  | "ventas-metricas"
  | "ventas"
  | "caja"
  | "reportes-ventas";

interface SidebarProps {
  user: User;
  currentSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  user,
  currentSection,
  onSectionChange,
  isOpen,
  onClose,
}: SidebarProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const menuItems: Array<{
    id: DashboardSection;
    label: string;
    icon: string;
  }> = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "new-order", label: "Nueva Orden", icon: "➕" },
    { id: "orders", label: "Órdenes", icon: "📋" },
    { id: "pos", label: "Punto de Venta", icon: "🛒" },
    { id: "productos-stock", label: "Productos/Stock", icon: "📦" },
    { id: "ventas", label: "Ventas", icon: "🧾" },
    { id: "ventas-metricas", label: "Métricas Ventas", icon: "📈" },
    { id: "caja", label: "Caja Diaria", icon: "💰" },
    { id: "reportes-ventas", label: "Reportes PDF", icon: "📄" },
    { id: "customers", label: "Clientes", icon: "👥" },
    { id: "branches", label: "Sucursales", icon: "🏢" },
    { id: "users", label: "Usuarios", icon: "👤" },
    { id: "reports", label: "Reportes", icon: "📊" },
    { id: "settings", label: "Configuración", icon: "⚙️" },
    { id: "security", label: "Seguridad", icon: "🔒" },
  ];

  // Filtrar items según permisos del usuario
  const filteredItems = menuItems.filter(item => canAccessSection(user, item.id));

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-20 left-0 h-[calc(100vh-5rem)] w-64 bg-white border-r border-gray-200 shadow-lg z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="p-4 space-y-2 h-full overflow-y-auto">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSectionChange(item.id);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                currentSection === item.id
                  ? "bg-brand text-white font-semibold shadow-md"
                  : "text-gray-700 hover:bg-gray-100 hover:text-brand"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}



