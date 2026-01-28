import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import type { Producto, User } from '@/types';
import { formatCurrency } from '@/lib/currency';

interface ProductosStockProps {
  user: User;
}

export default function ProductosStock({ user }: ProductosStockProps) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [modoEscaneo, setModoEscaneo] = useState(false);
  const [codigoEscaneado, setCodigoEscaneado] = useState('');

  // Formulario
  const [formData, setFormData] = useState({
    codigo_barras: '',
    nombre: '',
    categoria: '',
    precio_venta: '',
    costo: '',
    stock_actual: '',
    stock_minimo: '',
  });

  // Cargar productos
  const cargarProductos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('productos')
        .select('*')
        .order('nombre', { ascending: true });

      // Filtrar por búsqueda
      if (busqueda) {
        query = query.or(
          `nombre.ilike.%${busqueda}%,codigo_barras.ilike.%${busqueda}%,categoria.ilike.%${busqueda}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      setProductos(data || []);
    } catch (err: any) {
      console.error('Error cargando productos:', err);
      setError('Error al cargar productos: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }, [busqueda]);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  // Manejar escaneo de código de barras
  const manejarEscaneo = useCallback(
    async (codigoBarras: string) => {
      if (!modoEscaneo) return;

      setCodigoEscaneado(codigoBarras);

      // Buscar si el producto ya existe
      const { data: productoExistente } = await supabase
        .from('productos')
        .select('*')
        .eq('codigo_barras', codigoBarras)
        .single();

      if (productoExistente) {
        // Si existe, abrir formulario para editar
        setProductoEditando(productoExistente);
        setFormData({
          codigo_barras: productoExistente.codigo_barras || '',
          nombre: productoExistente.nombre,
          categoria: productoExistente.categoria || '',
          precio_venta: productoExistente.precio_venta.toString(),
          costo: productoExistente.costo.toString(),
          stock_actual: productoExistente.stock_actual.toString(),
          stock_minimo: productoExistente.stock_minimo.toString(),
        });
        setMostrarFormulario(true);
      } else {
        // Si no existe, crear nuevo con código escaneado
        setFormData({
          codigo_barras: codigoBarras,
          nombre: '',
          categoria: '',
          precio_venta: '',
          costo: '',
          stock_actual: '0',
          stock_minimo: '0',
        });
        setProductoEditando(null);
        setMostrarFormulario(true);
      }
    },
    [modoEscaneo]
  );

  // Hook de escaneo (solo activo en modo escaneo)
  useBarcodeScanner(manejarEscaneo, {
    enabled: modoEscaneo,
    minLength: 3,
    timeout: 100,
  });

  // Guardar producto
  const guardarProducto = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const datos = {
        codigo_barras: formData.codigo_barras || null,
        nombre: formData.nombre,
        categoria: formData.categoria || null,
        precio_venta: parseFloat(formData.precio_venta) || 0,
        costo: parseFloat(formData.costo) || 0,
        stock_actual: parseInt(formData.stock_actual) || 0,
        stock_minimo: parseInt(formData.stock_minimo) || 0,
        activo: true,
        sucursal_id: user.sucursal_id || null,
      };

      if (productoEditando) {
        // Actualizar
        const { error } = await supabase
          .from('productos')
          .update(datos)
          .eq('id', productoEditando.id);

        if (error) throw error;
      } else {
        // Crear nuevo
        const { error } = await supabase.from('productos').insert(datos);

        if (error) throw error;
      }

      // Limpiar formulario y recargar
      setMostrarFormulario(false);
      setProductoEditando(null);
      setFormData({
        codigo_barras: '',
        nombre: '',
        categoria: '',
        precio_venta: '',
        costo: '',
        stock_actual: '',
        stock_minimo: '',
      });
      cargarProductos();
    } catch (err: any) {
      console.error('Error guardando producto:', err);
      
      // Manejar errores específicos
      let mensajeError = 'Error al guardar producto: ';
      
      if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('unique constraint')) {
        mensajeError = 'El código de barras ya existe. Por favor, usa otro código o déjalo vacío.';
      } else if (err.code === '23514' || err.message?.includes('check constraint')) {
        mensajeError = 'Error de validación: ' + (err.message || 'Datos inválidos');
      } else if (err.message?.includes('row-level security') || err.message?.includes('RLS')) {
        mensajeError = 'Error de permisos. Verifica que tienes acceso para crear/editar productos.';
      } else if (err.message?.includes('El código de barras')) {
        mensajeError = err.message;
      } else {
        mensajeError += err.message || 'Error desconocido';
      }
      
      setError(mensajeError);
    } finally {
      setLoading(false);
    }
  }, [formData, productoEditando, user, cargarProductos]);

  // Agregar stock a un producto
  const agregarStock = useCallback(
    async (producto: Producto, cantidad: number) => {
      try {
        setLoading(true);
        setError(null);

        const nuevaCantidad = producto.stock_actual + cantidad;

        // Actualizar stock
        const { error: updateError } = await supabase
          .from('productos')
          .update({ stock_actual: nuevaCantidad })
          .eq('id', producto.id);

        if (updateError) throw updateError;

        // Registrar movimiento
        const { error: movimientoError } = await supabase
          .from('inventario_movimientos')
          .insert({
            producto_id: producto.id,
            tipo_movimiento: cantidad > 0 ? 'compra' : 'ajuste',
            cantidad,
            cantidad_anterior: producto.stock_actual,
            cantidad_nueva: nuevaCantidad,
            usuario_id: user.id,
            observaciones: cantidad > 0 ? 'Carga de stock' : 'Ajuste de stock',
          });

        if (movimientoError) {
          console.error('Error registrando movimiento:', movimientoError);
          // No lanzar error aquí, el stock ya se actualizó
        }

        cargarProductos();
      } catch (err: any) {
        console.error('Error agregando stock:', err);
        
        let mensajeError = 'Error al actualizar stock: ';
        
        if (err.code === '23514' || err.message?.includes('check constraint')) {
          mensajeError = 'Cantidad inválida. El stock no puede ser negativo.';
        } else if (err.message?.includes('row-level security') || err.message?.includes('RLS')) {
          mensajeError = 'Error de permisos. Verifica que tienes acceso para actualizar stock.';
        } else {
          mensajeError += err.message || 'Error desconocido';
        }
        
        setError(mensajeError);
      } finally {
        setLoading(false);
      }
    },
    [user, cargarProductos]
  );

  // Manejar escaneo para agregar stock
  const manejarEscaneoStock = useCallback(
    async (codigoBarras: string) => {
      if (!modoEscaneo) return;

      const { data: producto } = await supabase
        .from('productos')
        .select('*')
        .eq('codigo_barras', codigoBarras)
        .single();

      if (producto) {
        const cantidad = prompt(`Ingresa la cantidad a agregar para: ${producto.nombre}`);
        if (cantidad && !isNaN(parseInt(cantidad))) {
          await agregarStock(producto, parseInt(cantidad));
        }
      }
    },
    [modoEscaneo, agregarStock]
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Gestión de Productos y Stock</h2>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setModoEscaneo(!modoEscaneo);
              setCodigoEscaneado('');
            }}
            className={`px-4 py-2 rounded-lg font-medium ${
              modoEscaneo
                ? 'bg-green-600 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {modoEscaneo ? '🟢 Modo Escaneo ON' : '⚪ Modo Escaneo OFF'}
          </button>
          <button
            onClick={() => {
              setProductoEditando(null);
              setFormData({
                codigo_barras: '',
                nombre: '',
                categoria: '',
                precio_venta: '',
                costo: '',
                stock_actual: '0',
                stock_minimo: '0',
              });
              setMostrarFormulario(true);
            }}
            className="px-4 py-2 bg-brand-light text-white rounded-lg font-medium hover:bg-brand-dark"
          >
            + Nuevo Producto
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {modoEscaneo && (
        <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          <p className="font-medium">Modo Escaneo Activado</p>
          <p className="text-sm">
            Escanea un código de barras para crear o editar un producto
            {codigoEscaneado && ` (Último: ${codigoEscaneado})`}
          </p>
        </div>
      )}

      {/* Búsqueda */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre, código o categoría..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-light focus:border-transparent"
        />
      </div>

      {/* Formulario */}
      {mostrarFormulario && (
        <div className="mb-6 p-4 bg-slate-50 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">
            {productoEditando ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Código de Barras <span className="text-slate-400 text-xs">(Opcional)</span>
              </label>
              <input
                type="text"
                value={formData.codigo_barras}
                onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="Escanea o ingresa código (opcional)"
                data-barcode-scanner="enabled"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
              <input
                type="text"
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="Ej: Fundas, Cables, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Precio de Venta *
              </label>
              <input
                type="number"
                value={formData.precio_venta}
                onChange={(e) => setFormData({ ...formData, precio_venta: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Costo</label>
              <input
                type="number"
                value={formData.costo}
                onChange={(e) => setFormData({ ...formData, costo: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stock Inicial</label>
              <input
                type="number"
                value={formData.stock_actual}
                onChange={(e) => setFormData({ ...formData, stock_actual: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Stock Mínimo
              </label>
              <input
                type="number"
                value={formData.stock_minimo}
                onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                min="0"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={guardarProducto}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              disabled={loading || !formData.nombre}
            >
              Guardar
            </button>
            <button
              onClick={() => {
                setMostrarFormulario(false);
                setProductoEditando(null);
              }}
              className="px-6 py-2 bg-slate-400 text-white rounded-lg font-medium hover:bg-slate-500"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de productos */}
      {loading && productos.length === 0 ? (
        <div className="text-center py-8 text-slate-500">Cargando productos...</div>
      ) : productos.length === 0 ? (
        <div className="text-center py-8 text-slate-500">No hay productos registrados</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-slate-700">Código</th>
                <th className="text-left p-3 text-slate-700">Nombre</th>
                <th className="text-left p-3 text-slate-700">Categoría</th>
                <th className="text-right p-3 text-slate-700">Precio</th>
                <th className="text-right p-3 text-slate-700">Stock</th>
                <th className="text-center p-3 text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => (
                <tr
                  key={producto.id}
                  className={`border-b ${
                    producto.stock_actual <= producto.stock_minimo ? 'bg-red-50' : ''
                  }`}
                >
                  <td className="p-3 text-slate-600">{producto.codigo_barras || '-'}</td>
                  <td className="p-3 font-medium text-slate-800">{producto.nombre}</td>
                  <td className="p-3 text-slate-600">{producto.categoria || '-'}</td>
                  <td className="p-3 text-right font-medium text-slate-800">
                    {formatCurrency(producto.precio_venta)}
                  </td>
                  <td className="p-3 text-right">
                    <span
                      className={`font-medium ${
                        producto.stock_actual <= producto.stock_minimo
                          ? 'text-red-600'
                          : 'text-slate-800'
                      }`}
                    >
                      {producto.stock_actual}
                    </span>
                    {producto.stock_actual <= producto.stock_minimo && (
                      <span className="ml-2 text-xs text-red-600">⚠ Bajo</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => {
                          const cantidad = prompt(
                            `Agregar stock a: ${producto.nombre}\nStock actual: ${producto.stock_actual}`
                          );
                          if (cantidad && !isNaN(parseInt(cantidad))) {
                            agregarStock(producto, parseInt(cantidad));
                          }
                        }}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                        disabled={loading}
                      >
                        + Stock
                      </button>
                      <button
                        onClick={() => {
                          setProductoEditando(producto);
                          setFormData({
                            codigo_barras: producto.codigo_barras || '',
                            nombre: producto.nombre,
                            categoria: producto.categoria || '',
                            precio_venta: producto.precio_venta.toString(),
                            costo: producto.costo.toString(),
                            stock_actual: producto.stock_actual.toString(),
                            stock_minimo: producto.stock_minimo.toString(),
                          });
                          setMostrarFormulario(true);
                        }}
                        className="px-3 py-1 bg-slate-500 text-white rounded text-sm hover:bg-slate-600"
                        disabled={loading}
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
