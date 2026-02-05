import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { UserPermissions, Branch } from "@/types";

interface BranchPermissionsModalProps {
  branch: Branch;
  users: any[]; // Mantener para compatibilidad, pero no se usa
  onClose: () => void;
  onSave: () => void;
}

const PERMISSIONS = [
  { key: "use_admin_panel", label: "Permiso para usar panel de administración" },
  { key: "use_statistics_panel", label: "Permiso para usar panel de estadísticas" },
  { key: "modify_orders", label: "Permiso para modificar ordenes" },
  { key: "edit_product_stock", label: "Permiso para editar el stock de productos" },
  { key: "delete_orders", label: "Permiso para eliminar órdenes" },
  { key: "use_branch_panel", label: "Permiso para uso de panel de sucursales" },
  { key: "view_all_business_orders", label: "Permiso para ver ordenes de todo el negocio" },
  { key: "edit_view_cost_price", label: "Permiso para editar y ver costo y precio" },
  { key: "create_orders", label: "Permiso para crear órdenes" },
  { key: "close_day", label: "Permiso para cerrar dia" },
] as const;

export default function BranchPermissionsModal({
  branch,
  users,
  onClose,
  onSave,
}: BranchPermissionsModalProps) {
  const [permissions, setPermissions] = useState<UserPermissions>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cargar permisos de la sucursal
  useEffect(() => {
    async function loadBranchPermissions() {
      try {
        setLoading(true);
        // Cargar datos actualizados de la sucursal
        const { data: branchData, error } = await supabase
          .from("branches")
          .select("permissions")
          .eq("id", branch.id)
          .single();

        if (error) throw error;

        // Si la sucursal tiene permisos, usarlos; si no, usar un objeto vacío
        setPermissions((branchData?.permissions as UserPermissions) || {});
      } catch (error: any) {
        console.error("Error cargando permisos de sucursal:", error);
        setPermissions({});
      } finally {
        setLoading(false);
      }
    }

    loadBranchPermissions();
  }, [branch.id]);

  async function handleSavePermissions() {
    setSaving(true);
    try {
      // Actualizar permisos de la sucursal directamente
      const { error: permError } = await supabase
        .from("branches")
        .update({
          permissions: permissions,
        })
        .eq("id", branch.id);

      if (permError) throw permError;

      alert("Permisos de la sucursal guardados exitosamente");
      onSave();
    } catch (error: any) {
      console.error("Error guardando permisos:", error);
      alert(`Error: ${error.message || 'Error desconocido'}`);
    } finally {
      setSaving(false);
    }
  }

  function togglePermission(key: keyof UserPermissions) {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2">
            <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
              Permisos - {branch.name || branch.razon_social}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 text-xl sm:text-2xl self-end sm:self-auto"
            >
              ×
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-slate-600">Cargando permisos...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700 font-medium mb-2">
                  📋 Permisos de la Sucursal: <strong>{branch.name || branch.razon_social}</strong>
                </p>
                <p className="text-xs text-blue-600">
                  Estos permisos determinan qué acciones puede realizar esta sucursal al iniciar sesión.
                  Marca o desmarca los permisos según lo que necesites.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PERMISSIONS.map((perm) => (
                  <label
                    key={perm.key}
                    className="flex items-center gap-3 p-3 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50 hover:border-brand-light transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={permissions[perm.key as keyof UserPermissions] || false}
                      onChange={() => togglePermission(perm.key as keyof UserPermissions)}
                      className="w-5 h-5 text-brand-light rounded focus:ring-brand-light"
                    />
                    <span className="text-sm text-slate-700 flex-1">{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-md text-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleSavePermissions}
              disabled={loading || saving}
              className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Guardando..." : "Guardar Permisos"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
