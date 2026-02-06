import type { User, UserPermissions } from "@/types";

/**
 * Verifica si un usuario tiene un permiso específico
 */
function isAdminLike(user: User | null): boolean {
  return !!user && (user.role === "admin" || user.role === "encargado");
}

export function hasPermission(user: User | null, permission: keyof UserPermissions): boolean {
  if (!user) return false;
  
  // Admins y encargados tienen todos los permisos
  if (isAdminLike(user)) return true;
  
  // Verificar permiso específico
  return user.permissions?.[permission] === true;
}

/**
 * Verifica si un usuario puede acceder a una sección específica
 */
export function canAccessSection(user: User | null, section: string): boolean {
  if (!user) return false;
  
  // Admins y encargados tienen acceso a todo
  if (isAdminLike(user)) return true;
  
  // Permisos por sección
  switch (section) {
    case "dashboard":
      // Todos pueden ver el dashboard (pero con métricas limitadas)
      return true;
    
    case "new-order":
      // Solo si tiene permiso explícito para crear órdenes
      return hasPermission(user, "create_orders") === true;
    
    case "orders":
      // Solo si tiene permiso explícito para ver órdenes (o puede crear, lo que implica que puede ver)
      return hasPermission(user, "create_orders") === true || 
             hasPermission(user, "modify_orders") === true ||
             hasPermission(user, "view_all_business_orders") === true;
    
    case "customers":
      // Solo si tiene permiso explícito
      return hasPermission(user, "view_all_business_orders") === true;
    
    case "branches":
      // Solo pueden ver/editar su propia sucursal si tienen permiso
      return hasPermission(user, "use_branch_panel") === true;
    
    case "users":
      // Solo admin
      return false;
    
    case "reports":
      // Solo si tiene permiso
      return hasPermission(user, "use_statistics_panel") === true;
    
    case "settings":
      // Solo admin
      return false;
    
    case "security":
      // Solo admin
      return false;
    
    case "pos":
      // Todos los usuarios autenticados pueden usar el POS
      return true;
    
    case "productos-stock":
      // Todos los usuarios autenticados pueden ver productos/stock
      return true;
    
    case "ventas":
      // Todos los usuarios autenticados pueden ver ventas
      return true;
    
    case "ventas-metricas":
      // Todos los usuarios autenticados pueden ver métricas básicas
      return true;
    
    case "caja":
      // Usuarios con permisos de ventas pueden gestionar caja
      return hasPermission(user, "create_orders") === true || 
             user.role === "admin" ||
             user.role === "encargado" ||
             user.role === "recepcionista";
    
    case "reportes-ventas":
      // Usuarios con permisos de ventas pueden ver reportes
      return hasPermission(user, "create_orders") === true || 
             user.role === "admin" ||
             user.role === "encargado" ||
             user.role === "recepcionista";
    
    default:
      return false;
  }
}

/**
 * Obtiene los permisos por defecto para un nuevo usuario
 */
export function getDefaultPermissions(): UserPermissions {
  return {
    create_orders: true, // Por defecto pueden crear órdenes
    modify_orders: true, // Por defecto pueden editar órdenes
    // Todos los demás permisos son false por defecto
  };
}

/**
 * Verifica si un usuario puede ver métricas completas en el dashboard
 */
export function canViewFullMetrics(user: User | null): boolean {
  if (!user) return false;
  if (isAdminLike(user)) return true;
  return hasPermission(user, "use_statistics_panel") === true || 
         hasPermission(user, "use_admin_panel") === true;
}

