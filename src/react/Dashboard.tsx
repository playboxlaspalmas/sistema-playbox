import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@/types";
import { getSystemSettings, type LogoConfig } from "@/lib/settings";
import { canAccessSection } from "@/lib/permissions";
import Sidebar, { type DashboardSection } from "./components/Sidebar";
import AdminDashboard from "./components/AdminDashboard";
import TechnicianDashboard from "./components/TechnicianDashboard";
import OrdersTable from "./components/OrdersTable";
import OrderForm from "./components/OrderForm";
import CustomersList from "./components/CustomersList";
import BranchesList from "./components/BranchesList";
import UsersList from "./components/UsersList";
import Reports from "./components/Reports";
import Settings from "./components/Settings";
import SecuritySettings from "./components/SecuritySettings";
import POS from "./components/POS";
import ProductosStock from "./components/ProductosStock";
import VentasMetricas from "./components/VentasMetricas";
import VentasList from "./components/VentasList";
import CajaManager from "./components/CajaManager";
import SalesReports from "./components/SalesReports";
import BulkStockManager from "./components/BulkStockManager";

function Header({ 
  userName, 
  userRole,
  branchName,
  onMenuToggle 
}: { 
  userName: string; 
  userRole: string;
  branchName?: string | null;
  onMenuToggle?: () => void;
}) {
  const [logoConfig, setLogoConfig] = useState<LogoConfig>({ url: "/logo.png", width: 128, height: 128 });
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    async function loadLogo() {
      try {
        const settings = await getSystemSettings();
        // Si la URL es relativa, asegurarse de que empiece con /
        let logoUrl = settings.header_logo.url;
        if (!logoUrl.startsWith("http") && !logoUrl.startsWith("data:") && !logoUrl.startsWith("/")) {
          logoUrl = "/" + logoUrl;
        }
        setLogoConfig({ ...settings.header_logo, url: logoUrl });
        setLogoError(false);
      } catch (error) {
        console.error("Error cargando logo:", error);
        // Usar logo por defecto
        setLogoConfig({ url: "/logo.png", width: 128, height: 128 });
      }
    }
    loadLogo();
  }, []);

  async function handleLogout() {
    // Limpiar sesión de sucursal si existe
    localStorage.removeItem('branchSession');
    // Cerrar sesión de usuario si existe
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const hasSidebar = userRole === "admin" || userRole === "encargado" || userRole === "technician" || userRole === "recepcionista";

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm fixed top-0 left-0 right-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-2 sm:gap-4">
            {hasSidebar && onMenuToggle && (
              <button
                onClick={onMenuToggle}
                className="lg:hidden text-gray-700 p-2 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Abrir menú"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <img 
              src={logoConfig.url} 
              alt="Playbox Logo" 
              style={{
                width: `${logoConfig.width}px`,
                height: `${logoConfig.height}px`,
                objectFit: 'contain'
              }}
              onError={(e) => {
                // Si falla cargar el logo, usar el por defecto
                const target = e.target as HTMLImageElement;
                if (typeof window !== 'undefined' && target.src !== window.location.origin + "/logo.png") {
                  target.src = "/logo.png";
                } else if (typeof window === 'undefined') {
                  target.src = "/logo.png";
                }
              }}
            />
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-lg font-bold text-gray-900">
                Sistema de Gestión de Órdenes
              </h1>
              <p className="text-xs text-gray-600">
                {branchName 
                  ? `Sucursal: ${branchName}`
                  : `${userName} • ${userRole === "admin" ? "Administrador" : userRole === "encargado" ? "Encargado" : userRole === "recepcionista" ? "Recepcionista" : "Técnico"}`
                }
              </p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-sm font-bold text-gray-900 truncate max-w-[150px]">
                {branchName ? `Sucursal: ${branchName}` : userName}
              </h1>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors whitespace-nowrap shadow-sm"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </header>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<DashboardSection>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Cargar sección desde localStorage o URL hash solo en el cliente
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Primero intentar desde URL hash
    if (window.location.hash) {
      const hashSection = window.location.hash.substring(1) as DashboardSection;
      const validSections: DashboardSection[] = ["dashboard", "new-order", "orders", "customers", "branches", "users", "reports", "settings", "security", "pos", "productos-stock", "ventas", "ventas-metricas"];
      if (validSections.includes(hashSection)) {
        setSection(hashSection);
        return;
      }
    }
    // Luego intentar desde localStorage
    const savedSection = localStorage.getItem("dashboard_section") as DashboardSection | null;
    if (savedSection) {
      const validSections: DashboardSection[] = ["dashboard", "new-order", "orders", "customers", "branches", "users", "reports", "settings", "security", "pos", "productos-stock", "ventas", "ventas-metricas"];
      if (validSections.includes(savedSection)) {
        setSection(savedSection);
      }
    }
  }, []); // Solo ejecutar una vez al montar

  // Guardar sección en localStorage y URL hash cuando cambia (solo en cliente)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem("dashboard_section", section);
    window.location.hash = section;
  }, [section]);

  // Escuchar cambios en el hash de la URL (navegación del navegador) - solo en cliente
  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleHashChange() {
      const hashSection = window.location.hash.substring(1) as DashboardSection;
      const validSections: DashboardSection[] = ["dashboard", "new-order", "orders", "customers", "branches", "users", "reports", "settings", "security", "pos", "productos-stock", "ventas", "ventas-metricas"];
      if (validSections.includes(hashSection)) {
        setSection(hashSection);
      }
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    async function loadUser() {
      // Verificar si hay sesión de sucursal (solo en cliente)
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }

      const branchSessionStr = localStorage.getItem('branchSession');
      if (branchSessionStr) {
        try {
          const branchSession = JSON.parse(branchSessionStr);
          if (branchSession.type === 'branch' && branchSession.branchId) {
            // Cargar datos de la sucursal
            const { data: branchData, error: branchError } = await supabase
              .from("branches")
              .select("*")
              .eq("id", branchSession.branchId)
              .eq("is_active", true)
              .single();

            if (branchError || !branchData) {
              // Si la sucursal no existe o está inactiva, limpiar sesión y redirigir
              if (typeof window !== 'undefined') {
                localStorage.removeItem('branchSession');
                window.location.href = "/login";
              }
              return;
            }

            // Crear un objeto User simulado para la sucursal
            const branchUser: User = {
              id: branchData.id,
              email: branchData.login_email || branchData.email || '',
              name: branchData.name,
              role: 'branch' as any, // Tipo especial para sucursales
              avatar_url: branchData.logo_url || null,
              sucursal_id: branchData.id, // La sucursal es su propia sucursal
              permissions: {
                create_orders: true,
                modify_orders: true,
                view_all_business_orders: false,
                use_branch_panel: true,
                use_statistics_panel: false,
                use_security_panel: false,
              },
              created_at: branchData.created_at,
            };

            setUser(branchUser);
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error("Error cargando sesión de sucursal:", error);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('branchSession');
          }
        }
      }

      // Si no hay sesión de sucursal, intentar cargar usuario normal
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      console.log("Dashboard - Auth user:", authUser?.email, "Error:", authError);
      
      if (!authUser) {
        console.log("Dashboard - No hay usuario autenticado, redirigiendo a login");
        if (typeof window !== 'undefined') {
          // Limpiar cualquier sesión antes de redirigir
          await supabase.auth.signOut();
          window.location.href = "/login";
        }
        return;
      }

      console.log("Dashboard - Buscando usuario en tabla users con ID:", authUser.id);
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(`
          *,
          sucursal:branches(id, name, razon_social)
        `)
        .eq("id", authUser.id)
        .single();

      console.log("Dashboard - Usuario encontrado:", userData?.email, "Error:", userError);

      if (userError) {
        console.error("Dashboard - Error al cargar usuario:", userError);
        // Si es un error de RLS o no encontrado, mostrar error pero no redirigir infinitamente
        if (userError.code === 'PGRST116' || userError.message.includes('row-level security')) {
          console.error("Dashboard - Error de RLS o usuario no encontrado en tabla users");
          setLoading(false);
          return; // No redirigir, dejar que se muestre el error
        }
      }

      if (userData) {
        console.log("Dashboard - Usuario cargado correctamente:", userData.email, userData.role);
        setUser(userData);
      } else {
        console.error("Dashboard - Usuario no encontrado en tabla users");
        // No redirigir inmediatamente, dejar que se muestre el estado de carga
      }
      
      setLoading(false);
    }

    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark-light">
        <p className="text-brand-gold-400">Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark-light">
        <div className="bg-brand-dark-lighter border border-brand-dark-border-gold p-6 rounded-lg shadow-medium max-w-md" style={{
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
        }}>
          <h2 className="text-xl font-bold text-red-400 mb-4">Error al Cargar Usuario</h2>
          <p className="text-brand-black-text mb-4">
            No se pudo cargar la información del usuario desde la base de datos.
          </p>
          <p className="text-sm text-brand-gold-400 mb-4">
            Verifica que el usuario existe en la tabla <code className="text-brand">users</code> con el mismo UUID de <code className="text-brand">auth.users</code>.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    // Verificar permisos antes de renderizar
    if (!canAccessSection(user, section)) {
      return (
        <div className="bg-brand-dark-lighter border border-brand-dark-border-gold rounded-lg shadow-medium p-6" style={{
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
        }}>
          <div className="text-center py-12">
            <p className="text-brand-gold-400 text-lg mb-2">Acceso Denegado</p>
            <p className="text-brand-black-text">No tienes permisos para acceder a esta sección.</p>
            <button
              onClick={() => setSection("dashboard")}
              className="mt-4 px-4 py-2 bg-brand text-brand-black rounded-md hover:bg-brand-light font-bold transition-colors"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      );
    }

    switch (section) {
      case "dashboard":
        if (user.role === "admin" || user.role === "encargado") {
          return <AdminDashboard user={user} onNewOrder={() => setSection("new-order")} />;
        } else if (user.role === "branch") {
          // Dashboard para sucursales
          return <TechnicianDashboard technicianId={user.id} isEncargado={false} user={user} onNewOrder={() => setSection("new-order")} />;
        } else {
          return <TechnicianDashboard technicianId={user.id} isEncargado={user.role === "encargado"} user={user} onNewOrder={() => setSection("new-order")} />;
        }
      case "new-order":
        return <OrderForm technicianId={user.id} onSaved={() => setSection("orders")} />;
      case "orders":
        // Solo admin tiene isAdmin=true, los demás usuarios (incluido encargado/tienda) no son admin
        // Admin puede ver todas las órdenes, usuarios de sucursal solo ven las de su sucursal
        return (
          <OrdersTable
            technicianId={user.role === "admin" || user.role === "encargado" ? undefined : user.id}
            isAdmin={user.role === "admin" || user.role === "encargado"}
            user={user}
            onNewOrder={() => setSection("new-order")}
          />
        );
      case "customers":
        return <CustomersList user={user} />;
      case "branches":
        return <BranchesList currentUser={user} />;
      case "users":
        return <UsersList />;
      case "reports":
        return <Reports user={user} />;
      case "settings":
        return <Settings />;
      case "security":
        return <SecuritySettings />;
      case "pos":
        return <POS user={user} />;
      case "productos-stock":
        return (
          <div className="space-y-6">
            <ProductosStock user={user} />
            <BulkStockManager user={user} />
          </div>
        );
      case "ventas":
        return <VentasList user={user} />;
      case "ventas-metricas":
        return <VentasMetricas />;
      case "caja":
        return <CajaManager user={user} />;
      case "reportes-ventas":
        return <SalesReports user={user} />;
      default:
        return <AdminDashboard user={user} onNewOrder={() => setSection("new-order")} />;
    }
  };

  // Mostrar sidebar si tiene acceso a alguna sección además del dashboard
  const showSidebar = user.role === "admin" || 
    canAccessSection(user, "new-order") || 
    canAccessSection(user, "orders") || 
    canAccessSection(user, "pos") ||
    canAccessSection(user, "productos-stock") ||
    canAccessSection(user, "ventas-metricas") ||
    canAccessSection(user, "customers") || 
    canAccessSection(user, "branches") || 
    canAccessSection(user, "reports");

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <Header 
        userName={user.name} 
        userRole={user.role}
        branchName={
          user.role === "branch" 
            ? user.name // Si es sucursal, usar el nombre de la sucursal
            : ((user as any).sucursal?.name || (user as any).sucursal?.razon_social || null)
        }
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className="flex">
        {showSidebar && (
          <Sidebar
            user={user}
            currentSection={section}
            onSectionChange={setSection}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )}
        
        <main className={`flex-1 ${showSidebar ? 'lg:ml-64' : ''} p-3 sm:p-4 md:p-6 lg:p-8`}>
          <div className="max-w-full overflow-x-hidden">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

