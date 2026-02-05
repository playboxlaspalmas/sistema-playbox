import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCLP } from "@/lib/currency";
import type { User, Branch } from "@/types";
import { canViewFullMetrics } from "@/lib/permissions";
import KpiCard from "./KpiCard";

interface AdminDashboardProps {
  user?: User;
  onNewOrder?: () => void;
}

export default function AdminDashboard({ user, onNewOrder }: AdminDashboardProps) {
  const [kpis, setKpis] = useState({
    daySales: 0,
    monthSales: 0,
    inRepair: 0,
    readyToDeliver: 0,
    inWarranty: 0,
    repuestosVendidos: 0,
  });
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showRepuestosDetail, setShowRepuestosDetail] = useState(false);
  const [repuestosVendidos, setRepuestosVendidos] = useState<any[]>([]);

  useEffect(() => {
    loadBranches();
  }, []);

  async function loadBranches() {
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .order("name");
      
      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error("Error cargando sucursales:", error);
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

        // Base query
        let baseQuery = supabase.from("work_orders").select("*");

        // Filtrar por sucursal si se seleccionó una
        if (branchFilter !== "all") {
          baseQuery = baseQuery.eq("sucursal_id", branchFilter);
        }

        // Ventas del día (órdenes entregadas hoy) - usar created_at o updated_at cuando cambió a entregada
        let dayQuery = supabase
          .from("work_orders")
          .select("total_repair_cost")
          .eq("status", "entregada")
          .gte("created_at", today.toISOString())
          .lte("created_at", todayEnd.toISOString());
        
        if (branchFilter !== "all") {
          dayQuery = dayQuery.eq("sucursal_id", branchFilter);
        }

        const { data: dayOrders } = await dayQuery;
        const daySales = (dayOrders || []).reduce((sum, o) => sum + (o.total_repair_cost || 0), 0);

        // Ventas del mes (órdenes entregadas este mes)
        let monthQuery = supabase
          .from("work_orders")
          .select("total_repair_cost")
          .eq("status", "entregada")
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString());
        
        if (branchFilter !== "all") {
          monthQuery = monthQuery.eq("sucursal_id", branchFilter);
        }

        const { data: monthOrders } = await monthQuery;
        const monthSales = (monthOrders || []).reduce((sum, o) => sum + (o.total_repair_cost || 0), 0);

        // Equipos en reparación
        let repairQuery = supabase
          .from("work_orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "en_proceso");
        
        if (branchFilter !== "all") {
          repairQuery = repairQuery.eq("sucursal_id", branchFilter);
        }

        const { count: inRepairCount } = await repairQuery;

        // Equipos listos para entregar
        let readyQuery = supabase
          .from("work_orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "por_entregar");
        
        if (branchFilter !== "all") {
          readyQuery = readyQuery.eq("sucursal_id", branchFilter);
        }

        const { count: readyCount } = await readyQuery;

        // Equipos en garantía
        let warrantyQuery = supabase
          .from("work_orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "garantia");
        
        if (branchFilter !== "all") {
          warrantyQuery = warrantyQuery.eq("sucursal_id", branchFilter);
        }

        const { count: warrantyCount } = await warrantyQuery;

        // Repuestos vendidos (contar repuestos en órdenes entregadas)
        // Primero obtener IDs de órdenes entregadas o por entregar
        let ordersQuery = supabase
          .from("work_orders")
          .select("id")
          .in("status", ["entregada", "por_entregar"]);
        
        if (branchFilter !== "all") {
          ordersQuery = ordersQuery.eq("sucursal_id", branchFilter);
        }

        const { data: ordersData } = await ordersQuery;
        const orderIds = ordersData?.map(o => o.id) || [];

        if (orderIds.length > 0) {
          const { data: repuestosData, error: repuestosError } = await supabase
            .from("order_repuestos")
            .select("id, order_id, repuesto_nombre, dispositivo_marca, dispositivo_modelo, cantidad, precio_venta, subtotal")
            .in("order_id", orderIds);

          if (!repuestosError && repuestosData) {
            // Obtener información de las órdenes
            const { data: ordersInfo } = await supabase
              .from("work_orders")
              .select("id, order_number")
              .in("id", orderIds);

            const ordersMap = new Map(ordersInfo?.map(o => [o.id, o.order_number]) || []);
            
            const repuestosConOrden = repuestosData.map(r => ({
              ...r,
              order_number: ordersMap.get(r.order_id) || 'N/A'
            }));

            const totalRepuestos = repuestosData.reduce((sum, r) => sum + (r.cantidad || 0), 0);
            setRepuestosVendidos(repuestosConOrden);
            setKpis({
              daySales,
              monthSales,
              inRepair: inRepairCount || 0,
              readyToDeliver: readyCount || 0,
              inWarranty: warrantyCount || 0,
              repuestosVendidos: totalRepuestos,
            });
          } else {
            setKpis({
              daySales,
              monthSales,
              inRepair: inRepairCount || 0,
              readyToDeliver: readyCount || 0,
              inWarranty: warrantyCount || 0,
              repuestosVendidos: 0,
            });
          }
        } else {
          setKpis({
            daySales,
            monthSales,
            inRepair: inRepairCount || 0,
            readyToDeliver: readyCount || 0,
            inWarranty: warrantyCount || 0,
            repuestosVendidos: 0,
          });
        }
      } catch (error) {
        console.error("Error cargando KPIs:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, branchFilter]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-slate-600">Cargando métricas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Dashboard Administrativo</h1>
          <p className="text-slate-600">Vista general del sistema</p>
        </div>
        {onNewOrder && (
          <button
            onClick={onNewOrder}
            className="px-6 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors font-medium shadow-sm"
          >
            ➕ Nueva Orden
          </button>
        )}
      </div>

      {/* Filtro de sucursal */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Filtrar por Sucursal
        </label>
        <select
          className="w-full md:w-auto min-w-[200px] border border-slate-300 rounded-md px-3 py-2"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
        >
          <option value="all">Todas las sucursales</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name || branch.razon_social}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <KpiCard
          title="Ventas del Día"
          value={formatCLP(kpis.daySales)}
          icon="💰"
        />
        <KpiCard
          title="Ventas del Mes"
          value={formatCLP(kpis.monthSales)}
          icon="📊"
        />
        <KpiCard
          title="En Reparación"
          value={kpis.inRepair.toString()}
          icon="🔧"
        />
        <KpiCard
          title="Listos para Entregar"
          value={kpis.readyToDeliver.toString()}
          icon="✅"
        />
        <KpiCard
          title="En Garantía"
          value={kpis.inWarranty.toString()}
          icon="🛡️"
        />
        <div 
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setShowRepuestosDetail(!showRepuestosDetail)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Repuestos Vendidos</p>
              <p className="text-2xl font-bold text-slate-900">{kpis.repuestosVendidos}</p>
            </div>
            <span className="text-3xl">🔩</span>
          </div>
        </div>
      </div>

      {/* Detalle de repuestos vendidos */}
      {showRepuestosDetail && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-900">Repuestos Vendidos</h2>
            <button
              onClick={() => setShowRepuestosDetail(false)}
              className="text-slate-500 hover:text-slate-700"
            >
              ✕
            </button>
          </div>
          {repuestosVendidos.length === 0 ? (
            <p className="text-slate-600">No hay repuestos vendidos aún.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Orden
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Dispositivo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Repuesto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Precio Venta
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {repuestosVendidos.map((repuesto: any) => (
                    <tr key={repuesto.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                        {repuesto.order_number || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                        {repuesto.dispositivo_marca} {repuesto.dispositivo_modelo}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                        {repuesto.repuesto_nombre}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                        {repuesto.cantidad}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                        {formatCLP(repuesto.precio_venta || 0)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                        {formatCLP(repuesto.subtotal || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

