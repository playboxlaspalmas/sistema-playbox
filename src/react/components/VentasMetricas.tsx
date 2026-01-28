import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { VentaDelDia, ProductoMasVendido, ProductoStockBajo } from '@/types';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function VentasMetricas() {
  const [ventasDia, setVentasDia] = useState<VentaDelDia[]>([]);
  const [productosMasVendidos, setProductosMasVendidos] = useState<ProductoMasVendido[]>([]);
  const [productosStockBajo, setProductosStockBajo] = useState<ProductoStockBajo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalDia, setTotalDia] = useState(0);
  const [cantidadVentas, setCantidadVentas] = useState(0);

  // Cargar métricas
  const cargarMetricas = async () => {
    try {
      setLoading(true);
      setError(null);

      // Ventas del día
      const { data: ventasData, error: ventasError } = await supabase
        .from('ventas_del_dia')
        .select('*')
        .order('created_at', { ascending: false });

      if (ventasError) throw ventasError;

      setVentasDia(ventasData || []);
      setCantidadVentas(ventasData?.length || 0);
      setTotalDia((ventasData || []).reduce((sum, v) => sum + v.total, 0));

      // Productos más vendidos
      const { data: productosData, error: productosError } = await supabase
        .from('productos_mas_vendidos')
        .select('*')
        .limit(10);

      if (productosError) throw productosError;

      setProductosMasVendidos(productosData || []);

      // Stock bajo
      const { data: stockData, error: stockError } = await supabase
        .from('productos_stock_bajo')
        .select('*')
        .order('stock_actual', { ascending: true });

      if (stockError) throw stockError;

      setProductosStockBajo(stockData || []);
    } catch (err: any) {
      console.error('Error cargando métricas:', err);
      setError('Error al cargar métricas: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarMetricas();
    // Recargar cada 30 segundos
    const interval = setInterval(cargarMetricas, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Resumen del día */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-slate-600 mb-2">Ventas del Día</h3>
          <p className="text-3xl font-bold text-slate-800">{cantidadVentas}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-slate-600 mb-2">Total del Día</h3>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(totalDia)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-slate-600 mb-2">Productos con Stock Bajo</h3>
          <p className="text-3xl font-bold text-red-600">{productosStockBajo.length}</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas del día */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Ventas del Día</h3>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Cargando...</div>
          ) : ventasDia.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No hay ventas hoy</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {ventasDia.map((venta) => (
                <div
                  key={venta.id}
                  className="flex justify-between items-center p-3 bg-slate-50 rounded border"
                >
                  <div>
                    <p className="font-medium text-slate-800">{venta.numero_venta}</p>
                    <p className="text-sm text-slate-600">
                      {format(new Date(venta.created_at), 'HH:mm', { locale: es })} -{' '}
                      {venta.usuario_nombre}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-800">{formatCurrency(venta.total)}</p>
                    <p className="text-xs text-slate-600">{venta.metodo_pago}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Productos más vendidos */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Productos Más Vendidos</h3>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Cargando...</div>
          ) : productosMasVendidos.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No hay datos</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {productosMasVendidos.map((producto, index) => (
                <div
                  key={producto.id}
                  className="flex justify-between items-center p-3 bg-slate-50 rounded border"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-slate-400">#{index + 1}</span>
                    <div>
                      <p className="font-medium text-slate-800">{producto.nombre}</p>
                      <p className="text-sm text-slate-600">
                        {producto.total_vendido} unidades
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-800">
                      {formatCurrency(producto.total_ingresos)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stock bajo */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Productos con Stock Bajo
        </h3>
        {loading ? (
          <div className="text-center py-8 text-slate-500">Cargando...</div>
        ) : productosStockBajo.length === 0 ? (
          <div className="text-center py-8 text-green-600 font-medium">
            ✅ Todos los productos tienen stock suficiente
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-slate-700">Código</th>
                  <th className="text-left p-3 text-slate-700">Nombre</th>
                  <th className="text-left p-3 text-slate-700">Categoría</th>
                  <th className="text-right p-3 text-slate-700">Stock Actual</th>
                  <th className="text-right p-3 text-slate-700">Stock Mínimo</th>
                  <th className="text-right p-3 text-slate-700">Precio</th>
                </tr>
              </thead>
              <tbody>
                {productosStockBajo.map((producto) => (
                  <tr key={producto.id} className="border-b bg-red-50">
                    <td className="p-3 text-slate-600">{producto.codigo_barras || '-'}</td>
                    <td className="p-3 font-medium text-slate-800">{producto.nombre}</td>
                    <td className="p-3 text-slate-600">{producto.categoria || '-'}</td>
                    <td className="p-3 text-right font-medium text-red-600">
                      {producto.stock_actual}
                    </td>
                    <td className="p-3 text-right text-slate-600">{producto.stock_minimo}</td>
                    <td className="p-3 text-right font-medium text-slate-800">
                      {formatCurrency(producto.precio_venta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
