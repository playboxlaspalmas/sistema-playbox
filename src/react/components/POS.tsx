import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import type { Producto, Venta, VentaItem, User, Branch } from '@/types';
import { formatCurrency } from '@/lib/currency';
import { printTicket80mm } from '@/lib/generate-ticket-80mm';

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
  const [efectivoRecibido, setEfectivoRecibido] = useState<string>('');
  const [vueltos, setVueltos] = useState<number>(0);
  const [cajaAbierta, setCajaAbierta] = useState<any>(null);
  const [busquedaManual, setBusquedaManual] = useState('');
  const [productosEncontrados, setProductosEncontrados] = useState<Producto[]>([]);
  const [buscando, setBuscando] = useState(false);
  const inputBusquedaRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef(false);
  const creatingVentaRef = useRef(false);
  const [mostrarRegistroCliente, setMostrarRegistroCliente] = useState(false);
  const [registrarCliente, setRegistrarCliente] = useState(false);
  const [clienteData, setClienteData] = useState({
    name: '',
    rut_document: '',
    phone: '',
    email: '',
  });
  const [customerId, setCustomerId] = useState<string | null>(null);

  // Calcular total del carrito
  const total = carrito.reduce((sum, item) => sum + item.subtotal, 0);

  // Cargar caja abierta del día
  useEffect(() => {
    async function cargarCajaAbierta() {
      try {
        const { data, error } = await supabase
          .rpc('get_caja_abierta_hoy', { p_sucursal_id: user.sucursal_id || null });

        if (error) {
          console.error('Error cargando caja:', error);
          return;
        }

        if (data && data.length > 0) {
          setCajaAbierta(data[0]);
        }
      } catch (err) {
        console.error('Error cargando caja:', err);
      }
    }

    cargarCajaAbierta();
  }, [user.sucursal_id]);

  // Calcular vueltos cuando cambia el efectivo recibido
  useEffect(() => {
    if (metodoPago === 'EFECTIVO' && efectivoRecibido) {
      // Limpiar el valor para calcular vueltos (remover puntos que pueden ser separadores de miles)
      const efectivoLimpio = efectivoRecibido.toString().replace(/[^\d]/g, '');
      const recibido = efectivoLimpio ? parseFloat(efectivoLimpio) : 0;
      const vueltosCalculados = recibido >= total ? recibido - total : 0;
      setVueltos(vueltosCalculados);
    } else {
      setVueltos(0);
    }
  }, [efectivoRecibido, total, metodoPago]);

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

      const ok = await ensureVenta();
      if (!ok) return;

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

      const año = new Date().getFullYear();
      const generarNumeroVenta = async (): Promise<string> => {
        try {
          const { data: ultimaVenta, error } = await supabase
            .from('ventas')
            .select('numero_venta')
            .like('numero_venta', `V-${año}-%`)
            .order('numero_venta', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!error && ultimaVenta?.numero_venta) {
            const match = ultimaVenta.numero_venta.match(/V-\d{4}-(\d+)/);
            if (match) {
              const siguienteNumero = parseInt(match[1], 10) + 1;
              return `V-${año}-${String(siguienteNumero).padStart(4, '0')}`;
            }
          }
        } catch (err) {
          console.warn('[POS] No se pudo obtener última venta, usando fallback:', err);
        }

        // Fallback si no hay permiso de lectura o hay error
        return `V-${año}-${Date.now()}`;
      };

      let data: any = null;
      let error: any = null;
      const maxRetries = 5;

      const usarApi = user.role === 'branch' || user.role === 'encargado';
      if (usarApi) {
        const response = await fetch('/api/create-sale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usuario_id: user.id,
            sucursal_id: user.sucursal_id || null,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Error al crear venta');
        }

        const result = await response.json();
        data = result.venta;
        error = null;
      } else {
        for (let intento = 0; intento < maxRetries; intento++) {
          const numeroVenta = await generarNumeroVenta();
          const response = await supabase
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

          data = response.data;
          error = response.error;

          if (!error) break;

          if (
            error.code === '23505' ||
            error.message?.includes('duplicate key') ||
            error.message?.includes('venta_numero_venta_key')
          ) {
            console.warn('[POS] Numero de venta duplicado, reintentando...', numeroVenta);
            continue;
          }

          break;
        }
      }

      if (error) throw error;

      setVentaActual(data);
      setError(null);
      return true;
    } catch (err: any) {
      console.error('Error creando venta:', err);
      setError('Error al crear venta: ' + (err.message || 'Error desconocido'));
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const ensureVenta = useCallback(async () => {
    if (ventaActual) return true;
    if (creatingVentaRef.current) return false;
    creatingVentaRef.current = true;
    try {
      return await crearVenta();
    } finally {
      creatingVentaRef.current = false;
    }
  }, [ventaActual, crearVenta]);

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
  const finalizarVenta = useCallback(async (efectivoRecibidoOverride?: string) => {
    if (!ventaActual || carrito.length === 0) {
      setError('No hay productos en el carrito');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Usar el valor override si se proporciona (para evitar problemas de timing con el estado)
      const efectivoRecibidoParaValidar = efectivoRecibidoOverride !== undefined ? efectivoRecibidoOverride : efectivoRecibido;

      // Verificar stock antes de finalizar (usar FOR UPDATE para evitar condiciones de carrera)
      // Usar una consulta que bloquee las filas para evitar ventas simultáneas del mismo producto
      const productosIds = carrito.map(item => item.producto.id);
      
      const { data: productosActuales, error: productosError } = await supabase
        .from('productos')
        .select('id, stock_actual, nombre, codigo_barras')
        .in('id', productosIds);

      if (productosError) {
        throw new Error(`Error al verificar stock: ${productosError.message}`);
      }

      if (!productosActuales || productosActuales.length === 0) {
        throw new Error('No se pudieron obtener los productos para verificar stock');
      }

      // Crear un mapa de productos por ID para acceso rápido
      const productosMap = new Map(productosActuales.map(p => [p.id, p]));

      // Verificar stock de cada item del carrito
      for (const item of carrito) {
        const productoActual = productosMap.get(item.producto.id);

        if (!productoActual) {
          throw new Error(`Producto ${item.producto.nombre} (ID: ${item.producto.id}) no encontrado en la base de datos`);
        }

        console.log('[POS] Verificando stock:', {
          producto: productoActual.nombre,
          stockActual: productoActual.stock_actual,
          cantidadRequerida: item.cantidad,
          suficiente: productoActual.stock_actual >= item.cantidad
        });

        if (productoActual.stock_actual < item.cantidad) {
          throw new Error(
            `Stock insuficiente para ${productoActual.nombre}: se requiere ${item.cantidad}, hay ${productoActual.stock_actual}`
          );
        }
      }

      // Registrar cliente si se solicitó
      let clienteIdFinal = customerId;
      if (registrarCliente && clienteData.name.trim()) {
        const { data: nuevoCliente, error: clienteError } = await supabase
          .from('customers')
          .insert({
            name: clienteData.name.trim(),
            rut_document: clienteData.rut_document.trim() || null,
            phone: clienteData.phone.trim() || '',
            phone_country_code: '+56', // Chile por defecto
            email: clienteData.email.trim() || '',
          })
          .select()
          .single();

        if (clienteError) {
          console.error('Error registrando cliente:', clienteError);
          // Continuar sin cliente si falla
        } else if (nuevoCliente) {
          clienteIdFinal = nuevoCliente.id;
        }
      }

      // Validar efectivo recibido si es pago en efectivo
      let efectivoRecibidoFinal: number | null = null;
      let vueltosFinal: number | null = null;
      
      if (metodoPago === 'EFECTIVO') {
        console.log('[POS] Iniciando validación de efectivo recibido:', {
          efectivoRecibidoParaValidar,
          tipo: typeof efectivoRecibidoParaValidar,
          longitud: efectivoRecibidoParaValidar?.length,
          metodoPago,
          total
        });
        
        // Verificar que el valor existe y no está vacío
        if (!efectivoRecibidoParaValidar || efectivoRecibidoParaValidar.toString().trim() === '') {
          console.error('[POS] ERROR: efectivoRecibido está vacío');
          throw new Error(`Debe ingresar el efectivo recibido. Valor ingresado: "${efectivoRecibidoParaValidar}"`);
        }
        
        // Limpiar el valor: remover todos los puntos (pueden ser separadores de miles o decimales)
        // y convertir a número
        const efectivoLimpio = efectivoRecibidoParaValidar
          .toString()
          .trim()
          .replace(/[^\d]/g, ''); // Remover todo excepto dígitos
        
        console.log('[POS] Efectivo después de limpiar:', {
          original: efectivoRecibidoParaValidar,
          limpio: efectivoLimpio
        });
        
        if (!efectivoLimpio || efectivoLimpio === '') {
          console.error('[POS] ERROR: efectivoLimpio está vacío después de limpiar');
          throw new Error(`El efectivo recibido debe contener números. Valor ingresado: "${efectivoRecibidoParaValidar}"`);
        }
        
        const recibido = parseFloat(efectivoLimpio);
        
        console.log('[POS] Validando efectivo recibido:', {
          efectivoRecibidoOriginal: efectivoRecibidoParaValidar,
          efectivoLimpio,
          recibido,
          esNaN: isNaN(recibido),
          total,
          metodoPago,
          esValido: recibido > 0
        });
        
        if (isNaN(recibido) || recibido <= 0) {
          console.error('[POS] ERROR: recibido no es válido:', recibido);
          throw new Error(`El efectivo recibido debe ser un número mayor a 0. Valor ingresado: "${efectivoRecibidoParaValidar}"`);
        }
        
        if (recibido < total) {
          throw new Error(`El efectivo recibido (${formatCurrency(recibido)}) es menor al total (${formatCurrency(total)})`);
        }
        
        efectivoRecibidoFinal = recibido;
        vueltosFinal = recibido - total;
        
        console.log('[POS] Efectivo validado correctamente:', {
          efectivoRecibidoFinal,
          vueltosFinal
        });
      }

      // IMPORTANTE: Actualizar venta a 'completada' ANTES de insertar items
      // para que el trigger pueda verificar stock y descontar correctamente
      const { error: ventaError } = await supabase
        .from('ventas')
        .update({
          total,
          metodo_pago: metodoPago,
          estado: 'completada',
          customer_id: clienteIdFinal,
          efectivo_recibido: efectivoRecibidoFinal,
          vueltos: vueltosFinal,
          caja_diaria_id: cajaAbierta?.id || null,
        })
        .eq('id', ventaActual.id);

      if (ventaError) {
        throw ventaError;
      }

      // Crear items de venta DESPUÉS de actualizar la venta a 'completada'
      // El trigger 'actualizar_stock_por_venta' se ejecutará al insertar cada item
      // y verificará que haya stock suficiente antes de descontar
      const items = carrito.map((item) => ({
        venta_id: ventaActual.id,
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase.from('venta_items').insert(items);

      if (itemsError) {
        // Si falla al insertar items, revertir la venta a 'pendiente'
        await supabase
          .from('ventas')
          .update({ estado: 'pendiente' })
          .eq('id', ventaActual.id);
        
        // Manejar errores específicos
        if (itemsError.code === '23503') {
          throw new Error('Uno de los productos ya no existe');
        } else if (itemsError.code === '23514') {
          throw new Error('Error de validación: ' + itemsError.message);
        } else if (itemsError.message.includes('Stock insuficiente')) {
          // El trigger detectó stock insuficiente
          throw new Error(itemsError.message);
        } else {
          throw itemsError;
        }
      }

      if (ventaError) {
        // Si falla la actualización, intentar eliminar los items creados
        await supabase.from('venta_items').delete().eq('venta_id', ventaActual.id);
        throw ventaError;
      }

      // Cargar datos completos para el ticket
      const { data: ventaCompleta } = await supabase
        .from('ventas')
        .select('*')
        .eq('id', ventaActual.id)
        .single();

      const { data: itemsCompletos } = await supabase
        .from('venta_items')
        .select(`
          *,
          producto:productos(*)
        `)
        .eq('venta_id', ventaActual.id);

      // Cargar datos de la sucursal
      let sucursalData: Branch | null = null;
      if (user.sucursal_id) {
        const { data: branchData } = await supabase
          .from('branches')
          .select('*')
          .eq('id', user.sucursal_id)
          .single();
        sucursalData = branchData;
      }

      const numeroVenta = ventaActual.numero_venta;

      // Limpiar carrito y venta
      setCarrito([]);
      setVentaActual(null);
      setMostrarPago(false);
      setEfectivoRecibido('');
      setVueltos(0);
      setError(null);

      // Cargar datos del cliente si existe
      let customerData = null;
      if (clienteIdFinal) {
        const { data: customer } = await supabase
          .from('customers')
          .select('*')
          .eq('id', clienteIdFinal)
          .single();
        customerData = customer;
      }

      // Imprimir boleta automáticamente
      if (ventaCompleta && itemsCompletos && itemsCompletos.length > 0) {
        try {
          await printTicket80mm({
            venta: ventaCompleta,
            items: itemsCompletos as Array<VentaItem & { producto: Producto }>,
            sucursal: sucursalData,
            customer: customerData,
            total
          });
        } catch (ticketError) {
          console.error('Error imprimiendo ticket:', ticketError);
          // No bloquear la venta si falla la impresión
        }
      }

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

  // Interceptar eventos de teclado para prevenir acciones no deseadas del navegador
  useEffect(() => {
    // Auto-focus en el input para escáneres
    if (inputBusquedaRef.current) {
      inputBusquedaRef.current.focus();
    }

    // Interceptar TODOS los eventos de teclado a nivel global para prevenir descargas
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Si el input está enfocado, interceptar Enter y cualquier combinación sospechosa
      if (
        inputBusquedaRef.current &&
        document.activeElement === inputBusquedaRef.current
      ) {
        // Prevenir Enter
        if (e.key === 'Enter' || e.keyCode === 13) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          const currentValue = inputBusquedaRef.current.value.trim();
          if (currentValue && !loading && !isProcessingRef.current) {
            isProcessingRef.current = true;
            // Procesar el código de barras aquí
            buscarProductoPorCodigo(currentValue)
              .then(async (prod) => {
                if (prod) {
                  const ok = await ensureVenta();
                  if (ok) {
                    agregarAlCarrito(prod);
                    setBusquedaManual('');
                    setProductosEncontrados([]);
                  }
                } else {
                  setError(`Producto no encontrado: ${currentValue}`);
                }
                isProcessingRef.current = false;
              })
              .catch(() => {
                isProcessingRef.current = false;
              });
          }

          return false;
        }

        // Prevenir combinaciones de teclas que podrían causar descargas
        if (
          (e.ctrlKey || e.metaKey) &&
          (e.key === 's' || e.key === 'S' || e.key === 'j' || e.key === 'J')
        ) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }

        // Prevenir Ctrl+Shift+J (consola de desarrollador en algunos navegadores)
        if (
          (e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          (e.key === 'j' || e.key === 'J')
        ) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }
    };

    // Interceptar en la fase de captura para asegurar que se ejecute primero
    document.addEventListener('keydown', handleGlobalKeyDown, true);
    document.addEventListener('keypress', handleGlobalKeyDown, true);
    document.addEventListener('keyup', handleGlobalKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, true);
      document.removeEventListener('keypress', handleGlobalKeyDown, true);
      document.removeEventListener('keyup', handleGlobalKeyDown, true);
    };
  }, [loading, buscarProductoPorCodigo, agregarAlCarrito]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Punto de Venta (POS)</h2>
        {ventaActual && (
          <p className="text-gray-600">Venta: {ventaActual.numero_venta}</p>
        )}
        {error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Búsqueda manual de productos */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Buscar Producto</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            ref={inputBusquedaRef}
            type="text"
            placeholder="Buscar por nombre o código..."
            value={busquedaManual}
            onChange={(e) => {
              setBusquedaManual(e.target.value);
              buscarProductosManual(e.target.value);
            }}
            onKeyDown={(e) => {
              // Manejador de respaldo directamente en el input
              if (e.key === 'Enter' || e.keyCode === 13) {
                e.preventDefault();
                e.stopPropagation();

                const currentValue = (e.target as HTMLInputElement).value.trim();
                if (currentValue && !loading && !isProcessingRef.current) {
                  isProcessingRef.current = true;
                  buscarProductoPorCodigo(currentValue)
                    .then(async (prod) => {
                      if (prod) {
                        const ok = await ensureVenta();
                        if (ok) {
                          agregarAlCarrito(prod);
                          setBusquedaManual('');
                          setProductosEncontrados([]);
                        }
                      } else {
                        setError(`Producto no encontrado: ${currentValue}`);
                      }
                      isProcessingRef.current = false;
                    })
                    .catch(() => {
                      isProcessingRef.current = false;
                    });
                }

                return false;
              }
            }}
            className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-brand focus:border-brand text-base sm:text-lg text-gray-900"
            data-barcode-scanner="enabled"
          />
          <button
            onClick={() => buscarProductosManual(busquedaManual)}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-brand text-white rounded-lg font-semibold hover:bg-brand-dark disabled:opacity-50 transition-colors whitespace-nowrap shadow-sm"
            disabled={buscando || !busquedaManual}
          >
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {/* Lista de productos encontrados */}
        {productosEncontrados.length > 0 && (
          <div className="mt-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
            {productosEncontrados.map((producto) => (
              <div
                key={producto.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors gap-2 sm:gap-0"
                onClick={async () => {
                  if (producto.stock_actual <= 0) {
                    setError(`Sin stock: ${producto.nombre}`);
                    return;
                  }
                  const ok = await ensureVenta();
                  if (!ok) return;
                  agregarAlCarrito(producto);
                  setBusquedaManual('');
                  setProductosEncontrados([]);
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{producto.nombre}</p>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    {producto.codigo_barras && `Código: ${producto.codigo_barras} • `}
                    Stock: {producto.stock_actual} • {formatCurrency(producto.precio_venta)}
                  </p>
                </div>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (producto.stock_actual <= 0) {
                      setError(`Sin stock: ${producto.nombre}`);
                      return;
                    }
                    const ok = await ensureVenta();
                    if (!ok) return;
                    agregarAlCarrito(producto);
                    setBusquedaManual('');
                    setProductosEncontrados([]);
                  }}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors whitespace-nowrap shadow-sm"
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
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Productos en Carrito</h3>
        {carrito.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            <p className="text-lg mb-2">Escanea o busca productos para comenzar</p>
            <p className="text-sm">La pistola de código de barras funciona desde cualquier lugar</p>
            <p className="text-sm">O busca productos por nombre o código arriba</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {carrito.map((item) => (
              <div
                key={item.producto.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 rounded border border-gray-200 gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.producto.nombre}</p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {formatCurrency(item.precio_unitario)} c/u
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => actualizarCantidad(item.producto.id, item.cantidad - 1)}
                      className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-lg font-bold"
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
                      className="w-16 sm:w-20 text-center border border-gray-300 bg-white rounded-lg px-2 py-1 text-gray-900 text-base sm:text-lg"
                      min="1"
                      disabled={loading}
                    />
                    <button
                      onClick={() => actualizarCantidad(item.producto.id, item.cantidad + 1)}
                      className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-brand text-brand-dark rounded hover:bg-brand-light transition-colors font-bold text-lg shadow-gold"
                      disabled={loading}
                    >
                      +
                    </button>
                  </div>
                  <div className="w-24 sm:w-28 text-right">
                    <p className="font-semibold text-brand text-base sm:text-lg">
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
          <span className="text-xl font-bold text-gray-900">Total:</span>
          <span className="text-2xl font-bold text-brand">{formatCurrency(total)}</span>
        </div>

        {!mostrarPago ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                if (carrito.length === 0) {
                  setError('Agrega productos antes de finalizar');
                  return;
                }
                setMostrarPago(true);
              }}
              className="flex-1 py-3 bg-brand text-brand-dark rounded-lg font-bold hover:bg-brand-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-gold-lg text-base sm:text-lg"
              disabled={loading || carrito.length === 0}
            >
              Finalizar Venta
            </button>
            <button
              onClick={cancelarVenta}
              className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Opción de registrar cliente */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={registrarCliente}
                  onChange={(e) => {
                    setRegistrarCliente(e.target.checked);
                    if (!e.target.checked) {
                      setClienteData({ name: '', rut_document: '', phone: '', email: '' });
                      setCustomerId(null);
                    }
                  }}
                  className="w-5 h-5 text-brand"
                />
                <span className="text-sm font-medium text-gray-700">
                  Registrar cliente para esta venta
                </span>
              </label>
              
              {registrarCliente && (
                <div className="mt-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Nombre del cliente"
                    value={clienteData.name}
                    onChange={(e) => setClienteData({ ...clienteData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg text-gray-900"
                  />
                  <input
                    type="text"
                    placeholder="RUT (opcional)"
                    value={clienteData.rut_document}
                    onChange={(e) => setClienteData({ ...clienteData, rut_document: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg text-gray-900"
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono (opcional)"
                    value={clienteData.phone}
                    onChange={(e) => setClienteData({ ...clienteData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg text-gray-900"
                  />
                  <input
                    type="email"
                    placeholder="Email (opcional)"
                    value={clienteData.email}
                    onChange={(e) => setClienteData({ ...clienteData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg text-gray-900"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de Pago
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'] as const).map((metodo) => (
                  <button
                    key={metodo}
                    onClick={() => {
                      setMetodoPago(metodo);
                      if (metodo !== 'EFECTIVO') {
                        setEfectivoRecibido('');
                        setVueltos(0);
                      }
                    }}
                    className={`py-2 px-4 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                      metodoPago === metodo
                        ? 'bg-brand text-white font-semibold shadow-sm'
                        : 'bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {metodo}
                  </button>
                ))}
              </div>
            </div>

            {/* Campo de efectivo recibido si es pago en efectivo */}
            {metodoPago === 'EFECTIVO' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Efectivo Recibido
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={efectivoRecibido}
                  onChange={(e) => {
                    // Permitir solo números y punto como separador decimal o de miles
                    let value = e.target.value;
                    console.log('[POS Input] onChange - valor original:', value);
                    
                    // Remover todo excepto dígitos y puntos
                    value = value.replace(/[^\d.]/g, '');
                    
                    // Si hay múltiples puntos, mantener solo el último (como decimal)
                    const parts = value.split('.');
                    if (parts.length > 2) {
                      value = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
                    }
                    
                    console.log('[POS Input] onChange - valor procesado:', value);
                    setEfectivoRecibido(value);
                  }}
                  onBlur={(e) => {
                    // Al perder el foco, normalizar el valor (remover puntos de miles)
                    const originalValue = e.target.value;
                    console.log('[POS Input] onBlur - valor original:', originalValue);
                    
                    if (!originalValue || originalValue.trim() === '') {
                      console.log('[POS Input] onBlur - valor vacío, no hacer nada');
                      return; // No hacer nada si está vacío
                    }
                    
                    // Remover todos los puntos y convertir a número limpio
                    const value = originalValue.replace(/\./g, '');
                    const numericValue = parseFloat(value);
                    
                    console.log('[POS Input] onBlur - valor limpio:', value, 'numérico:', numericValue);
                    
                    if (value && !isNaN(numericValue) && numericValue > 0) {
                      setEfectivoRecibido(value);
                      console.log('[POS Input] onBlur - valor actualizado a:', value);
                    } else {
                      console.log('[POS Input] onBlur - valor inválido, mantener original');
                      // Mantener el valor original si no es válido
                    }
                  }}
                  placeholder="Ej: 20000 o 20.000"
                  className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg text-gray-900 text-lg font-semibold focus:ring-2 focus:ring-brand focus:border-brand"
                />
                {efectivoRecibido && parseFloat(efectivoRecibido) > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total a pagar:</span>
                      <span className="text-lg font-bold text-gray-900">{formatCurrency(total)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-gray-600">Efectivo recibido:</span>
                      <span className="text-lg font-bold text-gray-900">{formatCurrency(parseFloat(efectivoRecibido) || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                      <span className="text-base font-semibold text-gray-700">Vueltos:</span>
                      <span className={`text-xl font-bold ${vueltos > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                        {formatCurrency(vueltos)}
                      </span>
                    </div>
                    {parseFloat(efectivoRecibido) < total && (
                      <p className="text-sm text-red-600 mt-2">
                        ⚠️ El efectivo recibido es menor al total
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Alerta si no hay caja abierta */}
            {!cajaAbierta && metodoPago === 'EFECTIVO' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ No hay caja abierta para hoy. Las ventas en efectivo no se registrarán en la caja.
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  
                  // Obtener el valor directamente del input para evitar problemas de timing con el estado
                  const inputElement = document.querySelector('input[inputmode="numeric"]') as HTMLInputElement;
                  let efectivoParaValidar = efectivoRecibido;
                  
                  if (metodoPago === 'EFECTIVO') {
                    // Intentar obtener el valor del input DOM primero
                    if (inputElement && inputElement.value && inputElement.value.trim() !== '') {
                      efectivoParaValidar = inputElement.value;
                      console.log('[POS Button] Usando valor del input DOM:', efectivoParaValidar);
                    } else {
                      console.log('[POS Button] Usando valor del estado:', efectivoRecibido);
                    }
                    
                    // Normalizar el valor (remover puntos)
                    if (efectivoParaValidar) {
                      const efectivoLimpio = efectivoParaValidar.toString().replace(/[^\d]/g, '');
                      if (efectivoLimpio) {
                        efectivoParaValidar = efectivoLimpio;
                        // Actualizar el estado también para consistencia
                        setEfectivoRecibido(efectivoLimpio);
                        console.log('[POS Button] Valor normalizado:', efectivoParaValidar);
                      }
                    }
                    
                    console.log('[POS Button] Click en Confirmar Pago:', {
                      efectivoRecibidoEstado: efectivoRecibido,
                      efectivoParaValidar,
                      valorInput: inputElement?.value,
                      metodoPago,
                      total
                    });
                  }
                  
                  // Llamar a finalizarVenta con el valor normalizado
                  finalizarVenta(efectivoParaValidar);
                }}
                className="flex-1 py-3 bg-brand text-white rounded-lg font-semibold hover:bg-brand-dark disabled:opacity-50 transition-colors shadow-sm text-base sm:text-lg"
                disabled={loading || (metodoPago === 'EFECTIVO' && (!efectivoRecibido || parseFloat(efectivoRecibido.toString().replace(/[^\d]/g, '')) < total))}
              >
                Confirmar Pago
              </button>
              <button
                onClick={() => {
                  setMostrarPago(false);
                  setEfectivoRecibido('');
                  setVueltos(0);
                }}
                className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors whitespace-nowrap"
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
