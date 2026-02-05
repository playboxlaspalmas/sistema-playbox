import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCLP } from '@/lib/currency';
import type { User, Venta, VentaItem } from '@/types';
import { generateSalesReportPDF } from '@/lib/generate-sales-report-pdf';

interface SalesReportsProps {
  user: User;
}

type ReportFilter = 'dia' | 'semana' | 'mes' | 'rango';

export default function SalesReports({ user }: SalesReportsProps) {
  const [filtro, setFiltro] = useState<ReportFilter>('dia');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [ventasItems, setVentasItems] = useState<Record<string, VentaItem[]>>({});
  const [cajaInicial, setCajaInicial] = useState<number>(0);
  const [totales, setTotales] = useState({
    total_efectivo: 0,
    total_tarjeta: 0,
    total_transferencia: 0,
    total_general: 0,
    total_vueltos: 0,
    cantidad_ventas: 0,
  });
  const [loading, setLoading] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  useEffect(() => {
    // Establecer fechas por defecto según el filtro
    const hoy = new Date();
    const fechaHoy = hoy.toISOString().split('T')[0];

    switch (filtro) {
      case 'dia':
        setFechaInicio(fechaHoy);
        setFechaFin(fechaHoy);
        break;
      case 'semana':
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay()); // Lunes
        setFechaInicio(inicioSemana.toISOString().split('T')[0]);
        setFechaFin(fechaHoy);
        break;
      case 'mes':
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        setFechaInicio(inicioMes.toISOString().split('T')[0]);
        setFechaFin(fechaHoy);
        break;
      case 'rango':
        if (!fechaInicio) setFechaInicio(fechaHoy);
        if (!fechaFin) setFechaFin(fechaHoy);
        break;
    }
  }, [filtro]);

  useEffect(() => {
    if (fechaInicio && fechaFin) {
      cargarReporte();
    }
  }, [fechaInicio, fechaFin, user.sucursal_id]);

  async function cargarReporte() {
    try {
      setLoading(true);

      // Cargar caja inicial del primer día
      const { data: cajaData } = await supabase
        .from('caja_diaria')
        .select('caja_inicial')
        .eq('fecha', fechaInicio)
        .eq('sucursal_id', user.sucursal_id || null)
        .maybeSingle();

      setCajaInicial(cajaData?.caja_inicial || 0);

      // Cargar ventas del período
      let query = supabase
        .from('ventas')
        .select('*')
        .gte('created_at', `${fechaInicio}T00:00:00`)
        .lte('created_at', `${fechaFin}T23:59:59`)
        .eq('estado', 'completada')
        .order('created_at', { ascending: false });

      if (user.sucursal_id) {
        query = query.eq('sucursal_id', user.sucursal_id);
      }

      const { data: ventasData, error: ventasError } = await query;

      if (ventasError) throw ventasError;

      setVentas(ventasData || []);

      // Cargar items de ventas
      if (ventasData && ventasData.length > 0) {
        const ventasIds = ventasData.map(v => v.id);
        const { data: itemsData, error: itemsError } = await supabase
          .from('venta_items')
          .select('*, producto:productos(nombre, codigo_barras)')
          .in('venta_id', ventasIds);

        if (itemsError) throw itemsError;

        // Agrupar items por venta_id
        const itemsPorVenta: Record<string, VentaItem[]> = {};
        (itemsData || []).forEach((item: any) => {
          if (!itemsPorVenta[item.venta_id]) {
            itemsPorVenta[item.venta_id] = [];
          }
          itemsPorVenta[item.venta_id].push(item);
        });

        setVentasItems(itemsPorVenta);

        // Calcular totales
        const totalesCalculados = {
          total_efectivo: ventasData
            .filter(v => v.metodo_pago === 'EFECTIVO')
            .reduce((sum, v) => sum + (v.total || 0), 0),
          total_tarjeta: ventasData
            .filter(v => v.metodo_pago === 'TARJETA')
            .reduce((sum, v) => sum + (v.total || 0), 0),
          total_transferencia: ventasData
            .filter(v => v.metodo_pago === 'TRANSFERENCIA')
            .reduce((sum, v) => sum + (v.total || 0), 0),
          total_general: ventasData.reduce((sum, v) => sum + (v.total || 0), 0),
          total_vueltos: ventasData.reduce((sum, v) => sum + (v.vueltos || 0), 0),
          cantidad_ventas: ventasData.length,
        };

        setTotales(totalesCalculados);
      } else {
        setTotales({
          total_efectivo: 0,
          total_tarjeta: 0,
          total_transferencia: 0,
          total_general: 0,
          total_vueltos: 0,
          cantidad_ventas: 0,
        });
        setVentasItems({});
      }
    } catch (err: any) {
      console.error('Error cargando reporte:', err);
    } finally {
      setLoading(false);
    }
  }

  async function generarPDF() {
    try {
      setGenerandoPDF(true);

      await generateSalesReportPDF({
        fechaInicio,
        fechaFin,
        ventas,
        ventasItems,
        cajaInicial,
        totales,
        sucursalId: user.sucursal_id || null,
      });
    } catch (err: any) {
      console.error('Error generando PDF:', err);
      alert('Error al generar PDF: ' + (err.message || 'Error desconocido'));
    } finally {
      setGenerandoPDF(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Reportes de Ventas</h2>
        <button
          onClick={generarPDF}
          disabled={generandoPDF || ventas.length === 0}
          className="px-6 py-2 bg-brand text-white rounded-lg font-semibold hover:bg-brand-dark disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
        >
          {generandoPDF ? 'Generando...' : '📄 Generar PDF'}
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Período
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(['dia', 'semana', 'mes', 'rango'] as ReportFilter[]).map((opcion) => (
              <button
                key={opcion}
                onClick={() => setFiltro(opcion)}
                className={`py-2 px-4 rounded-lg font-medium transition-colors text-sm ${
                  filtro === opcion
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {opcion === 'dia' ? 'Día' : opcion === 'semana' ? 'Semana' : opcion === 'mes' ? 'Mes' : 'Rango'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Inicio
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg text-gray-900 focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Fin
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg text-gray-900 focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Cargando reporte...</p>
        </div>
      ) : (
        <>
          {/* Resumen */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen del Período</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Caja Inicial</p>
                <p className="text-xl font-bold text-gray-900">{formatCLP(cajaInicial)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Ventas</p>
                <p className="text-xl font-bold text-gray-900">{formatCLP(totales.total_general)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Vueltos</p>
                <p className="text-xl font-bold text-red-600">-{formatCLP(totales.total_vueltos)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Cantidad Ventas</p>
                <p className="text-xl font-bold text-gray-900">{totales.cantidad_ventas}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Caja Final Estimada:</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatCLP(cajaInicial + totales.total_efectivo - totales.total_vueltos)}
                </span>
              </div>
            </div>
          </div>

          {/* Desglose por método de pago */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Desglose por Método de Pago</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600 mb-1">Efectivo</p>
                <p className="text-2xl font-bold text-blue-900">{formatCLP(totales.total_efectivo)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600 mb-1">Tarjeta</p>
                <p className="text-2xl font-bold text-green-900">{formatCLP(totales.total_tarjeta)}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-purple-600 mb-1">Transferencia</p>
                <p className="text-2xl font-bold text-purple-900">{formatCLP(totales.total_transferencia)}</p>
              </div>
            </div>
          </div>

          {/* Lista de ventas */}
          {ventas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No hay ventas en el período seleccionado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Venta</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Efectivo Recibido</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vueltos</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ventas.map((venta) => (
                    <tr key={venta.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {new Date(venta.created_at).toLocaleDateString('es-CL', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {venta.numero_venta}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {venta.metodo_pago}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {venta.efectivo_recibido ? formatCLP(venta.efectivo_recibido) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600">
                        {venta.vueltos ? `-${formatCLP(venta.vueltos)}` : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                        {formatCLP(venta.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
