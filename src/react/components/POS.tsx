import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import type { Producto, Venta, VentaItem, User } from '@/types';
import { formatCurrency } from '@/lib/currency';

interface POSProps {
  user: User;
}

interface CarritoItem {
  producto: Producto;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export default function POS({ user }: POSProps) {
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [ventaActual, setVentaActual] = useState<Venta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarPago, setMostrarPago] = useState(false);
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'>('EFECTIVO');
  const [busquedaManual, setBusquedaManual] = useState('');
  const [productosEncontrados, setProductosEncontrados] = useState<Producto[]>([]);
  const [buscando, setBuscando] = useState(false);

  // Calcular total del carrito
  const total = carrito.reduce((sum, item) => sum + item.subtotal, 0);

  // Función para buscar producto por código de barras
  const buscarProductoPorCodigo = useCallback(async (codigoBarras: string): Promise<Producto | null> => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('codigo_barras', codigoBarras)
        .eq('activo', true)
        .single();

      if (error) {
        console.error('Error buscando producto:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Error buscando producto:', err);
      return null;
    }
  }, []);

  // Función para buscar productos por nombre o código (búsqueda manual)
  const buscarProductosManual = useCallback(async (termino: string) => {
    if (!termino || termino.length < 2) {
      setProductosEncontrados([]);
      return;
    }

    try {
      setBuscando(true);
      setError(null);

      // Buscar por nombre o código de barras
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .or(`nombre.ilike.%${termino}%,codigo_barras.ilike.%${termino}%`)
        .limit(10);

      if (error) {
        console.error('Error buscando productos:', error);
        setError('Error al buscar productos');
        setProductosEncontrados([]);
        return;
      }

      setProductosEncontrados(data || []);
    } catch (err) {
      console.error('Error buscando productos:', err);
      setError('Error al buscar productos');
      setProductosEncontrados([]);
    } finally {
      setBuscando(false);
    }
  }, []);

  // Función para buscar producto (compatibilidad con código anterior)
  const buscarProducto = buscarProductoPorCodigo;

  // Función para agregar producto al carrito
  const agregarAlCarrito = useCallback(
    (producto: Producto) => {
      setCarrito((prev) => {
        const existe = prev.find((item) => item.producto.id === producto.id);

        if (existe) {
          // Si ya existe, incrementar cantidad
          return prev.map((item) =>
            item.producto.id === producto.id
              ? {
                  ...item,
                  cantidad: item.cantidad + 1,
                  subtotal: (item.cantidad + 1) * item.precio_unitario,
                }
              : item
          );
        } else {
          // Si no existe, agregar nuevo
          return [
            ...prev,
            {
              producto,
              cantidad: 1,
              precio_unitario: producto.precio_venta,
              subtotal: producto.precio_venta,
            },
          ];
        }
      });
    },
    []
  );

  // Función para manejar escaneo de código de barras
  const manejarEscaneo = useCallback(
    async (codigoBarras: string) => {
      setError(null);

      // Si no hay venta activa, crear una nueva
      if (!ventaActual) {
        await crearVenta();
      }

      // Buscar producto
      const producto = await buscarProducto(codigoBarras);

      if (!producto) {
        setError(`Producto no encontrado: ${codigoBarras}`);
        return;
      }

      // Verificar stock
      if (producto.stock_actual <= 0) {
        setError(`Sin stock: ${producto.nombre}`);
        return;
      }

      // Agregar al carrito
      agregarAlCarrito(producto);
    },
    [ventaActual, buscarProducto, agregarAlCarrito]
  );

  // Hook de escaneo global
  useBarcodeScanner(manejarEscaneo, {
    enabled: true,
    minLength: 3,
    timeout: 100,
  });

  // Crear nueva venta
  const crearVenta = useCallback(async () => {
    try {
      setLoading(true);

      // Generar número de venta manualmente (formato: V-YYYY-0001)
      const año = new Date().getFullYear();
      const { data: ultimaVenta } = await supabase
        .from('ventas')
        .select('numero_venta')
        .like('numero_venta', `V-${año}-%`)
        .order('numero_venta', { ascending: false })
        .limit(1)
        .single();

      let siguienteNumero = 1;
      if (ultimaVenta) {
        const match = ultimaVenta.numero_venta.match(/V-\d{4}-(\d+)/);
        if (match) {
          siguienteNumero = parseInt(match[1]) + 1;
        }
      }

      const numeroVenta = `V-${año}-${String(siguienteNumero).padStart(4, '0')}`;

      const { data, error } = await supabase
        .from('ventas')
        .insert({
          numero_venta: numeroVenta,
          usuario_id: user.id,
          sucursal_id: user.sucursal_id,
          total: 0,
          metodo_pago: 'EFECTIVO',
          estado: 'pendiente',
        })
        .select()
        .single();

      if (error) throw error;

      setVentaActual(data);
      setError(null);
    } catch (err: any) {
      console.error('Error creando venta:', err);
      setError('Error al crear venta: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Actualizar cantidad de un item
  const actualizarCantidad = useCallback((productoId: string, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      // Eliminar del carrito
      setCarrito((prev) => prev.filter((item) => item.producto.id !== productoId));
      return;
    }

    setCarrito((prev) =>
      prev.map((item) =>
        item.producto.id === productoId
          ? {
              ...item,
              cantidad: nuevaCantidad,
              subtotal: nuevaCantidad * item.precio_unitario,
            }
          : item
      )
    );
  }, []);

  // Finalizar venta
  const finalizarVenta = useCallback(async () => {
    if (!ventaActual || carrito.length === 0) {
      setError('No hay productos en el carrito');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Verificar stock antes de finalizar
      for (const item of carrito) {
        const { data: productoActual, error: productoError } = await supabase
          .from('productos')
          .select('stock_actual, nombre')
          .eq('id', item.producto.id)
          .single();

        if (productoError) {
          throw new Error(`Error al verificar stock: ${productoError.message}`);
        }

        if (!productoActual) {
          throw new Error(`Producto ${item.producto.nombre} no encontrado`);
        }

        if (productoActual.stock_actual < item.cantidad) {
          throw new Error(
            `Stock insuficiente para ${productoActual.nombre}: se requiere ${item.cantidad}, hay ${productoActual.stock_actual}`
          );
        }
      }

      // Crear items de venta
      const items = carrito.map((item) => ({
        venta_id: ventaActual.id,
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase.from('venta_items').insert(items);

      if (itemsError) {
        // Manejar errores específicos
        if (itemsError.code === '23503') {
          throw new Error('Uno de los productos ya no existe');
        } else if (itemsError.code === '23514') {
          throw new Error('Error de validación: ' + itemsError.message);
        } else {
          throw itemsError;
        }
      }

      // Actualizar venta con total y estado
      const { error: ventaError } = await supabase
        .from('ventas')
        .update({
          total,
          metodo_pago: metodoPago,
          estado: 'completada',
        })
        .eq('id', ventaActual.id);

      if (ventaError) {
        // Si falla la actualización, intentar eliminar los items creados
        await supabase.from('venta_items').delete().eq('venta_id', ventaActual.id);
        throw ventaError;
      }

      // Los movimientos de inventario se registran automáticamente mediante triggers
      // cuando se insertan los items de venta y la venta está en estado 'completada'

      const numeroVenta = ventaActual.numero_venta;

      // Limpiar carrito y venta
      setCarrito([]);
      setVentaActual(null);
      setMostrarPago(false);
      setError(null);

      // Mostrar mensaje de éxito
      alert(`Venta completada: ${numeroVenta}\nTotal: ${formatCurrency(total)}`);
    } catch (err: any) {
      console.error('Error finalizando venta:', err);
      const mensajeError = err.message || 'Error desconocido';
      
      // Mensajes más descriptivos según el tipo de error
      if (mensajeError.includes('Stock insuficiente')) {
        setError(mensajeError);
      } else if (mensajeError.includes('23503')) {
        setError('Uno de los productos ya no existe. Por favor, recarga la página y vuelve a intentar.');
      } else if (mensajeError.includes('23514')) {
        setError('Error de validación: ' + mensajeError);
      } else if (mensajeError.includes('row-level security') || mensajeError.includes('RLS')) {
        setError('Error de permisos. Verifica que tienes acceso para realizar ventas.');
      } else {
        setError('Error al finalizar venta: ' + mensajeError);
      }
    } finally {
      setLoading(false);
    }
  }, [ventaActual, carrito, total, metodoPago, user]);

  // Cancelar venta
  const cancelarVenta = useCallback(() => {
    if (confirm('¿Cancelar esta venta?')) {
      setCarrito([]);
      setVentaActual(null);
      setMostrarPago(false);
      setError(null);
    }
  }, []);

  // Inicializar venta al montar
  useEffect(() => {
    if (!ventaActual) {
      crearVenta();
    }
  }, []);

  return (
    <div className="bg-brand-black-lighter border border-brand-gold-600 rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-brand mb-2">Punto de Venta (POS)</h2>
        {ventaActual && (
          <p className="text-brand-gold-400">Venta: {ventaActual.numero_venta}</p>
        )}
        {error && (
          <div className="mt-2 p-3 bg-red-900/30 border border-red-600 text-red-300 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Búsqueda manual de productos */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-brand-gold-400 mb-3">Buscar Producto</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            value={busquedaManual}
            onChange={(e) => {
              setBusquedaManual(e.target.value);
              buscarProductosManual(e.target.value);
            }}
            className="flex-1 px-4 py-3 border-2 border-brand-black-border bg-brand-black rounded-lg focus:ring-2 focus:ring-brand focus:border-brand text-lg text-brand-black-text"
            data-barcode-scanner="enabled"
          />
          <button
            onClick={() => buscarProductosManual(busquedaManual)}
            className="px-6 py-3 bg-brand text-brand-black rounded-lg font-semibold hover:bg-brand-light disabled:opacity-50 font-bold transition-colors"
            disabled={buscando || !busquedaManual}
          >
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {/* Lista de productos encontrados */}
        {productosEncontrados.length > 0 && (
          <div className="mt-3 max-h-48 overflow-y-auto border border-brand-gold-600 rounded-lg bg-brand-black">
            {productosEncontrados.map((producto) => (
              <div
                key={producto.id}
                className="flex items-center justify-between p-3 border-b border-brand-black-border hover:bg-brand-black-lighter cursor-pointer transition-colors"
                onClick={() => {
                  if (producto.stock_actual <= 0) {
                    setError(`Sin stock: ${producto.nombre}`);
                    return;
                  }
                  agregarAlCarrito(producto);
                  setBusquedaManual('');
                  setProductosEncontrados([]);
                }}
              >
                <div className="flex-1">
                  <p className="font-medium text-brand-black-text">{producto.nombre}</p>
                  <p className="text-sm text-brand-gold-400">
                    {producto.codigo_barras && `Código: ${producto.codigo_barras} • `}
                    Stock: {producto.stock_actual} • {formatCurrency(producto.precio_venta)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (producto.stock_actual <= 0) {
                      setError(`Sin stock: ${producto.nombre}`);
                      return;
                    }
                    agregarAlCarrito(producto);
                    setBusquedaManual('');
                    setProductosEncontrados([]);
                  }}
                  className="px-4 py-2 bg-brand text-brand-black rounded hover:bg-brand-light disabled:opacity-50 font-bold transition-colors"
                  disabled={producto.stock_actual <= 0}
                >
                  Agregar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Carrito de productos */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-brand-gold-400 mb-3">Productos en Carrito</h3>
        {carrito.length === 0 ? (
          <div className="text-center py-8 text-brand-gold-400">
            <p className="text-lg mb-2">Escanea o busca productos para comenzar</p>
            <p className="text-sm">La pistola de código de barras funciona desde cualquier lugar</p>
            <p className="text-sm">O busca productos por nombre o código arriba</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {carrito.map((item) => (
              <div
                key={item.producto.id}
                className="flex items-center justify-between p-3 bg-brand-black rounded border border-brand-gold-600"
              >
                <div className="flex-1">
                  <p className="font-medium text-brand-black-text">{item.producto.nombre}</p>
                  <p className="text-sm text-brand-gold-400">
                    {formatCurrency(item.precio_unitario)} c/u
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => actualizarCantidad(item.producto.id, item.cantidad - 1)}
                    className="w-8 h-8 flex items-center justify-center bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    disabled={loading}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={item.cantidad}
                    onChange={(e) =>
                      actualizarCantidad(item.producto.id, parseInt(e.target.value) || 0)
                    }
                    className="w-16 text-center border border-brand-black-border bg-brand-black-lighter rounded px-2 py-1 text-brand-black-text"
                    min="1"
                    disabled={loading}
                  />
                  <button
                    onClick={() => actualizarCantidad(item.producto.id, item.cantidad + 1)}
                    className="w-8 h-8 flex items-center justify-center bg-brand text-brand-black rounded hover:bg-brand-light transition-colors font-bold"
                    disabled={loading}
                  >
                    +
                  </button>
                  <div className="w-24 text-right">
                    <p className="font-semibold text-brand">
                      {formatCurrency(item.subtotal)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total y botones */}
      <div className="border-t border-brand-gold-600 pt-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xl font-bold text-brand-gold-400">Total:</span>
          <span className="text-2xl font-bold text-brand">{formatCurrency(total)}</span>
        </div>

        {!mostrarPago ? (
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (carrito.length === 0) {
                  setError('Agrega productos antes de finalizar');
                  return;
                }
                setMostrarPago(true);
              }}
              className="flex-1 py-3 bg-brand text-brand-black rounded-lg font-bold hover:bg-brand-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-brand/50"
              disabled={loading || carrito.length === 0}
            >
              Finalizar Venta
            </button>
            <button
              onClick={cancelarVenta}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-gold-400 mb-2">
                Método de Pago
              </label>
              <div className="flex gap-3">
                {(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'] as const).map((metodo) => (
                  <button
                    key={metodo}
                    onClick={() => setMetodoPago(metodo)}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      metodoPago === metodo
                        ? 'bg-brand text-brand-black font-bold shadow-lg shadow-brand/50'
                        : 'bg-brand-black border border-brand-gold-600 text-brand-gold-400 hover:bg-brand-black-lighter'
                    }`}
                  >
                    {metodo}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={finalizarVenta}
                className="flex-1 py-3 bg-brand text-brand-black rounded-lg font-bold hover:bg-brand-light disabled:opacity-50 transition-colors shadow-lg shadow-brand/50"
                disabled={loading}
              >
                Confirmar Pago
              </button>
              <button
                onClick={() => setMostrarPago(false)}
                className="px-6 py-3 bg-brand-black-lighter border border-brand-gold-600 text-brand-gold-400 rounded-lg font-semibold hover:bg-brand-black transition-colors"
                disabled={loading}
              >
                Volver
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
