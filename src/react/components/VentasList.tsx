import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Venta, VentaItem, Producto, Customer, Branch } from '@/types';
import { formatCurrency } from '@/lib/currency';
import { formatDateTime } from '@/lib/date';
import { generateTicket80mm } from '@/lib/generate-ticket-80mm';

interface VentasListProps {
  user: any;
}

interface VentaCompleta extends Venta {
  items: Array<VentaItem & { producto: Producto }>;
  customer?: Customer | null;
  branch?: Branch | null;
}

export default function VentasList({ user }: VentasListProps) {
  const [ventas, setVentas] = useState<VentaCompleta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anulandoVentaId, setAnulandoVentaId] = useState<string | null>(null);
  const [fechaInicio, setFechaInicio] = useState<string>(() => {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState<string>(() => {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  });

  const cargarVentas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Crear fechas correctamente considerando la zona horaria local
      // fechaInicio viene como "YYYY-MM-DD", necesitamos crear la fecha en zona local
      const [añoInicio, mesInicio, diaInicio] = fechaInicio.split('-').map(Number);
      const [añoFin, mesFin, diaFin] = fechaFin.split('-').map(Number);
      
      // Crear fechas en zona horaria local (mes - 1 porque Date usa 0-11 para meses)
      const inicioLocal = new Date(añoInicio, mesInicio - 1, diaInicio, 0, 0, 0, 0);
      const finLocal = new Date(añoFin, mesFin - 1, diaFin, 23, 59, 59, 999);
      
      // Convertir a UTC para la consulta (Supabase almacena en UTC)
      const inicio = new Date(inicioLocal.toISOString());
      const fin = new Date(finLocal.toISOString());

      console.log('[VentasList] Fecha inicio local:', fechaInicio, '→', inicioLocal.toLocaleString());
      console.log('[VentasList] Fecha fin local:', fechaFin, '→', finLocal.toLocaleString());
      console.log('[VentasList] Buscando ventas desde:', inicio.toISOString(), 'hasta:', fin.toISOString());

      // Cargar ventas con items y productos
      // Usar un rango más amplio para asegurar que capture todas las ventas del día
      const { data: ventasData, error: ventasError } = await supabase
        .from('ventas')
        .select('*')
        .eq('estado', 'completada')
        .gte('created_at', inicio.toISOString())
        .lte('created_at', fin.toISOString())
        .order('created_at', { ascending: false });

      console.log('[VentasList] Ventas encontradas:', ventasData?.length || 0);
      if (ventasData && ventasData.length > 0) {
        console.log('[VentasList] Primera venta:', ventasData[0].numero_venta, ventasData[0].created_at);
      }

      if (ventasError) throw ventasError;

      // Cargar items y productos para cada venta
      const ventasCompletas: VentaCompleta[] = await Promise.all(
        (ventasData || []).map(async (venta) => {
          // Cargar items con productos
          const { data: itemsData } = await supabase
            .from('venta_items')
            .select(`
              *,
              producto:productos(*)
            `)
            .eq('venta_id', venta.id);

          // Cargar cliente si existe
          let customer = null;
          if (venta.customer_id) {
            const { data: customerData } = await supabase
              .from('customers')
              .select('*')
              .eq('id', venta.customer_id)
              .single();
            customer = customerData;
          }

          // Cargar sucursal
          let branch = null;
          if (venta.sucursal_id) {
            const { data: branchData } = await supabase
              .from('branches')
              .select('*')
              .eq('id', venta.sucursal_id)
              .single();
            branch = branchData;
          }

          return {
            ...venta,
            items: (itemsData || []) as Array<VentaItem & { producto: Producto }>,
            customer,
            branch
          };
        })
      );

      setVentas(ventasCompletas);
    } catch (err: any) {
      console.error('Error cargando ventas:', err);
      setError('Error al cargar ventas: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin]);

  useEffect(() => {
    cargarVentas();
  }, [cargarVentas]);

  const verVistaPrevia = async (venta: VentaCompleta) => {
    try {
      const blob = await generateTicket80mm({
        venta,
        items: venta.items,
        sucursal: venta.branch || null,
        customer: venta.customer || null,
        total: venta.total
      });
      
      const url = URL.createObjectURL(blob);
      // Abrir en nueva ventana para ver sin imprimir automáticamente
      window.open(url, '_blank');
      // No revocar la URL inmediatamente para que el usuario pueda ver el PDF
      // Se limpiará cuando se cierre la ventana
    } catch (err) {
      console.error('Error generando vista previa:', err);
      alert('Error al generar vista previa del ticket');
    }
  };

  const reimprimirTicket = async (venta: VentaCompleta) => {
    try {
      const blob = await generateTicket80mm({
        venta,
        items: venta.items,
        sucursal: venta.branch || null,
        customer: venta.customer || null,
        total: venta.total
      });
      
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            setTimeout(() => {
              printWindow.close();
              URL.revokeObjectURL(url);
            }, 1000);
          }, 500);
        };
      } else {
        // Si no se puede abrir ventana, descargar
        const link = document.createElement('a');
        link.href = url;
        link.download = `boleta-${venta.numero_venta}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error reimprimiendo ticket:', err);
      alert('Error al reimprimir ticket');
    }
  };

  const anularVenta = async (venta: VentaCompleta) => {
    const confirmado = window.confirm(
      `¿Anular la venta ${venta.numero_venta}? Esto devolverá el stock y la venta no aparecerá en los reportes.`
    );
    if (!confirmado) return;

    try {
      setAnulandoVentaId(venta.id);
      setError(null);

      for (const item of venta.items) {
        const { data: productoActual, error: productoError } = await supabase
          .from('productos')
          .select('id, stock_actual')
          .eq('id', item.producto_id)
          .single();

        if (productoError || !productoActual) {
          throw productoError || new Error('Producto no encontrado');
        }

        const cantidadAnterior = productoActual.stock_actual || 0;
        const cantidadNueva = cantidadAnterior + item.cantidad;

        const { error: updateError } = await supabase
          .from('productos')
          .update({ stock_actual: cantidadNueva })
          .eq('id', item.producto_id);

        if (updateError) throw updateError;

        const { error: movimientoError } = await supabase
          .from('inventario_movimientos')
          .insert({
            producto_id: item.producto_id,
            tipo_movimiento: 'ajuste',
            cantidad: item.cantidad,
            cantidad_anterior: cantidadAnterior,
            cantidad_nueva: cantidadNueva,
            venta_id: venta.id,
            usuario_id: user?.id || null,
            observaciones: `Anulación venta ${venta.numero_venta}`,
          });

        if (movimientoError) {
          console.warn('Error registrando movimiento:', movimientoError);
        }
      }

      const timestamp = new Date().toISOString();
      const nuevaObservacion = venta.observaciones
        ? `${venta.observaciones}\nAnulada por ${user?.name || 'Usuario'} (${timestamp})`
        : `Anulada por ${user?.name || 'Usuario'} (${timestamp})`;

      const { error: ventaError } = await supabase
        .from('ventas')
        .update({
          estado: 'cancelada',
          observaciones: nuevaObservacion,
        })
        .eq('id', venta.id);

      if (ventaError) throw ventaError;

      await cargarVentas();
    } catch (err: any) {
      console.error('Error anulando venta:', err);
      setError('Error al anular venta: ' + (err.message || 'Error desconocido'));
    } finally {
      setAnulandoVentaId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-brand-dark-text">Ventas Realizadas</h2>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="px-3 py-2 border border-brand-dark-border rounded text-sm"
          />
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="px-3 py-2 border border-brand-dark-border rounded text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-brand-dark-text">Cargando ventas...</div>
      ) : ventas.length === 0 ? (
        <div className="text-center py-8 text-brand-dark-text">No hay ventas en el rango de fechas seleccionado</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-brand-dark-lighter border-b border-brand-dark-border">
                <th className="px-3 py-2 text-left text-sm font-semibold text-brand-dark-text">N° Venta</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-brand-dark-text hidden sm:table-cell">Fecha</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-brand-dark-text hidden md:table-cell">Cliente</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-brand-dark-text">Items</th>
                <th className="px-3 py-2 text-right text-sm font-semibold text-brand-dark-text">Total</th>
                <th className="px-3 py-2 text-center text-sm font-semibold text-brand-dark-text">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((venta) => (
                <tr key={venta.id} className="border-b border-brand-dark-border hover:bg-brand-dark-lighter/50">
                  <td className="px-3 py-3 text-sm text-brand-dark-text font-medium">{venta.numero_venta}</td>
                  <td className="px-3 py-3 text-sm text-brand-dark-text hidden sm:table-cell">
                    {formatDateTime(venta.created_at)}
                  </td>
                  <td className="px-3 py-3 text-sm text-brand-dark-text hidden md:table-cell">
                    {venta.customer ? `${venta.customer.name}${venta.customer.rut_document ? ` (${venta.customer.rut_document})` : ''}` : '-'}
                  </td>
                  <td className="px-3 py-3 text-sm text-brand-dark-text">
                    {venta.items.length} {venta.items.length === 1 ? 'item' : 'items'}
                  </td>
                  <td className="px-3 py-3 text-sm text-brand-dark-text text-right font-semibold">
                    {formatCurrency(venta.total)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
                      <button
                        onClick={() => verVistaPrevia(venta)}
                        className="px-3 py-1 bg-brand-dark-lighter border border-brand-dark-border-gold text-brand-gold-400 font-medium rounded hover:bg-brand-dark transition-colors text-sm"
                        title="Ver ticket sin imprimir"
                      >
                        👁️ Ver
                      </button>
                      <button
                        onClick={() => reimprimirTicket(venta)}
                        className="px-3 py-1 bg-brand text-brand-dark font-medium rounded hover:bg-brand-light transition-colors text-sm"
                        title="Imprimir ticket automáticamente"
                      >
                        🖨️ Imprimir
                      </button>
                      <button
                        onClick={() => anularVenta(venta)}
                        className="px-3 py-1 bg-red-500 text-white font-medium rounded hover:bg-red-600 transition-colors text-sm"
                        title="Anular venta"
                        disabled={anulandoVentaId === venta.id}
                      >
                        🗑️ Anular
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && ventas.length > 0 && (
        <div className="text-sm text-brand-dark-text text-center">
          Total: {ventas.length} {ventas.length === 1 ? 'venta' : 'ventas'} • 
          Total vendido: {formatCurrency(ventas.reduce((sum, v) => sum + v.total, 0))}
        </div>
      )}
    </div>
  );
}
