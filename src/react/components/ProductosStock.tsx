import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import type { Producto, User, CategoriaAccesorio } from '@/types';
import { formatCurrency } from '@/lib/currency';
import CategoriasAccesorios from './CategoriasAccesorios';
import DispositivosRepuestos from './DispositivosRepuestos';

interface ProductosStockProps {
  user: User;
}

export default function ProductosStock({ user }: ProductosStockProps) {
  const [tabActiva, setTabActiva] = useState<'accesorios' | 'repuestos' | 'categorias' | 'dispositivos'>('accesorios');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaAccesorio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [modoEscaneo, setModoEscaneo] = useState(false);
  const [codigoEscaneado, setCodigoEscaneado] = useState('');
  const inputCodigoBarrasRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef(false);

  // Formulario
  const [formData, setFormData] = useState({
    codigo_barras: '',
    nombre: '',
    categoria: '',
    categoria_id: '',
    marca: '',
    modelo: '',
    precio_venta: '',
    costo: '',
    stock_actual: '',
    stock_minimo: '',
  });
  const [categoriaInput, setCategoriaInput] = useState('');
  const [categoriaSuggestions, setCategoriaSuggestions] = useState<CategoriaAccesorio[]>([]);
  const [showCategoriaSuggestions, setShowCategoriaSuggestions] = useState(false);
  const categoriaInputRef = useRef<HTMLInputElement>(null);
  const categoriaSuggestionsRef = useRef<HTMLDivElement>(null);

  // Cargar categorías
  const cargarCategorias = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('categorias_accesorios')
        .select('*')
        .eq('activa', true)
        .order('nombre', { ascending: true });

      if (error) throw error;
      setCategorias(data || []);
    } catch (err: any) {
      console.error('Error cargando categorías:', err);
    }
  }, []);

  // Cargar productos (solo accesorios)
  const cargarProductos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('productos')
        .select('*')
        .eq('tipo', 'accesorio')
        .order('nombre', { ascending: true });

      // Filtrar por búsqueda
      if (busqueda) {
        query = query.or(
          `nombre.ilike.%${busqueda}%,codigo_barras.ilike.%${busqueda}%,categoria.ilike.%${busqueda}%,marca.ilike.%${busqueda}%,modelo.ilike.%${busqueda}%`
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
    if (tabActiva === 'accesorios') {
      cargarProductos();
      cargarCategorias();
    }
  }, [cargarProductos, cargarCategorias, tabActiva]);

  // Cerrar sugerencias de categoría al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        categoriaInputRef.current &&
        categoriaSuggestionsRef.current &&
        !categoriaInputRef.current.contains(event.target as Node) &&
        !categoriaSuggestionsRef.current.contains(event.target as Node)
      ) {
        setShowCategoriaSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Interceptar eventos de teclado para prevenir acciones no deseadas del navegador
  useEffect(() => {
    // Auto-focus en el input para escáneres cuando el formulario está visible
    if (mostrarFormulario && inputCodigoBarrasRef.current) {
      // Usar setTimeout para asegurar que el DOM esté listo
      setTimeout(() => {
        if (inputCodigoBarrasRef.current) {
          inputCodigoBarrasRef.current.focus();
        }
      }, 100);
    }

    // Interceptar eventos de teclado para prevenir acciones no deseadas
    // Estrategia: Solo prevenir combinaciones problemáticas en fase de captura
    // Para Enter, prevenir solo si el input está enfocado, NO cuando el modo escaneo está activo globalmente
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const inputEnfocado = inputCodigoBarrasRef.current && 
                            document.activeElement === inputCodigoBarrasRef.current;
      const target = e.target as HTMLElement;
      const esInputCodigoBarras = target === inputCodigoBarrasRef.current ||
                                   (target.tagName === 'INPUT' && 
                                    target.getAttribute('data-barcode-scanner') === 'enabled');

      // Prevenir combinaciones problemáticas (siempre)
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 's' || e.key === 'S' || e.key === 'j' || e.key === 'J')
      ) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }

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

      // Para Enter: solo prevenir si el input está enfocado
      // Si el modo escaneo está activo pero el input NO está enfocado, NO prevenir
      // para que el hook useBarcodeScanner pueda procesar el código
      if (e.key === 'Enter' || e.keyCode === 13) {
        if (inputEnfocado || esInputCodigoBarras) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        // Si modo escaneo está activo pero input NO enfocado, NO hacer nada aquí
        // Dejar que el hook useBarcodeScanner maneje el Enter
      }
    };

    // Agregar listener en fase de burbuja (después del hook) para no interferir
    window.addEventListener('keydown', handleGlobalKeyDown, false);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, false);
    };
  }, [mostrarFormulario, modoEscaneo]);

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
          categoria_id: productoExistente.categoria_id || '',
          marca: productoExistente.marca || '',
          modelo: productoExistente.modelo || '',
          precio_venta: productoExistente.precio_venta.toString(),
          costo: productoExistente.costo.toString(),
          stock_actual: productoExistente.stock_actual.toString(),
          stock_minimo: productoExistente.stock_minimo.toString(),
        });
        setCategoriaInput(productoExistente.categoria || '');
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

      // Validar que el nombre no esté vacío
      if (!formData.nombre || formData.nombre.trim() === '') {
        setError('El nombre del producto es obligatorio');
        setLoading(false);
        return;
      }

      // Validar precio de venta
      const precioVenta = parseFloat(formData.precio_venta);
      if (isNaN(precioVenta) || precioVenta < 0) {
        setError('El precio de venta debe ser un número válido mayor o igual a 0');
        setLoading(false);
        return;
      }

      // Si hay una categoría escrita pero no existe, crearla primero
      let categoriaIdFinal = formData.categoria_id;
      if (categoriaInput && categoriaInput.trim() && !formData.categoria_id) {
        // Buscar si existe con el nombre exacto (case insensitive)
        const categoriaExistente = categorias.find(
          cat => cat.nombre.toLowerCase() === categoriaInput.trim().toLowerCase()
        );
        
        if (categoriaExistente) {
          categoriaIdFinal = categoriaExistente.id;
        } else {
          // Crear nueva categoría
          const { data: nuevaCategoria, error: catError } = await supabase
            .from('categorias_accesorios')
            .insert({
              nombre: categoriaInput.trim(),
              activa: true,
            })
            .select()
            .single();

          if (catError) throw catError;
          categoriaIdFinal = nuevaCategoria.id;
          // Recargar categorías
          await cargarCategorias();
        }
      }

      const datos = {
        codigo_barras: formData.codigo_barras && formData.codigo_barras.trim() !== '' ? formData.codigo_barras.trim() : null,
        nombre: formData.nombre.trim(),
        categoria: categoriaInput && categoriaInput.trim() !== '' ? categoriaInput.trim() : null,
        categoria_id: categoriaIdFinal || null,
        marca: formData.marca && formData.marca.trim() !== '' ? formData.marca.trim() : null,
        modelo: formData.modelo && formData.modelo.trim() !== '' ? formData.modelo.trim() : null,
        tipo: 'accesorio' as const,
        precio_venta: precioVenta,
        costo: parseFloat(formData.costo) || 0,
        stock_actual: parseInt(formData.stock_actual) || 0,
        stock_minimo: parseInt(formData.stock_minimo) || 0,
        activo: true,
        sucursal_id: user.sucursal_id || null,
      };

      console.log('[ProductosStock] Guardando producto:', datos);

      if (productoEditando) {
        // Actualizar
        console.log('[ProductosStock] Actualizando producto ID:', productoEditando.id);
        const { data, error } = await supabase
          .from('productos')
          .update(datos)
          .eq('id', productoEditando.id)
          .select();

        if (error) {
          console.error('[ProductosStock] Error actualizando:', error);
          throw error;
        }
        console.log('[ProductosStock] Producto actualizado:', data);
      } else {
        // Crear nuevo
        console.log('[ProductosStock] Creando nuevo producto');
        const { data, error } = await supabase
          .from('productos')
          .insert(datos)
          .select();

        if (error) {
          console.error('[ProductosStock] Error creando:', error);
          throw error;
        }
        console.log('[ProductosStock] Producto creado:', data);
      }

      // Limpiar formulario y recargar
      setMostrarFormulario(false);
      setProductoEditando(null);
      setCategoriaInput('');
      setShowCategoriaSuggestions(false);
      setFormData({
        codigo_barras: '',
        nombre: '',
        categoria: '',
        categoria_id: '',
        marca: '',
        modelo: '',
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
        <h2 className="text-2xl font-bold text-slate-800">Gestión de Stock</h2>
      </div>

      {/* Pestañas */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setTabActiva('accesorios')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              tabActiva === 'accesorios'
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📦 Accesorios
          </button>
          <button
            onClick={() => setTabActiva('repuestos')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              tabActiva === 'repuestos'
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🔩 Repuestos
          </button>
          <button
            onClick={() => setTabActiva('categorias')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              tabActiva === 'categorias'
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🏷️ Categorías
          </button>
          <button
            onClick={() => setTabActiva('dispositivos')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              tabActiva === 'dispositivos'
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📱 Dispositivos
          </button>
        </nav>
      </div>

      {/* Contenido según pestaña activa */}
      {tabActiva === 'categorias' && <CategoriasAccesorios user={user} />}
      {tabActiva === 'dispositivos' && <DispositivosRepuestos user={user} />}
      {tabActiva === 'repuestos' && <DispositivosRepuestos user={user} />}

      {tabActiva === 'accesorios' && (
        <>
          <div className="mb-6 flex justify-between items-center">
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
        categoria_id: '',
        marca: '',
        modelo: '',
        precio_venta: '',
        costo: '',
        stock_actual: '0',
        stock_minimo: '0',
      });
      setCategoriaInput('');
      setShowCategoriaSuggestions(false);
      setMostrarFormulario(true);
                }}
                className="px-4 py-2 bg-brand text-white rounded-lg font-medium hover:bg-brand-dark shadow-sm"
              >
                + Nuevo Accesorio
              </button>
            </div>
          </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {modoEscaneo && (
        <div className="mb-4 p-4 bg-green-100 border-2 border-green-500 rounded-lg">
          <p className="font-bold text-green-800 text-lg mb-2">🟢 Modo Escaneo ACTIVADO</p>
          <p className="text-sm text-green-700">
            Escanea un código de barras desde cualquier lugar de la pantalla.
            <br />
            Si el producto existe, se abrirá para editar. Si no existe, se creará uno nuevo.
            {codigoEscaneado && (
              <span className="block mt-2 font-semibold">
                Último código escaneado: {codigoEscaneado}
              </span>
            )}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Código de Barras <span className="text-slate-400 text-xs">(Opcional)</span>
              </label>
              <input
                ref={inputCodigoBarrasRef}
                type="text"
                value={formData.codigo_barras}
                onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
                onKeyDown={(e) => {
                  // Manejador de respaldo directamente en el input
                  if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    // El hook useBarcodeScanner ya maneja el procesamiento
                    return false;
                  }
                  
                  // Prevenir combinaciones de teclas problemáticas
                  if (
                    (e.ctrlKey || e.metaKey) &&
                    (e.key === 's' || e.key === 'S' || e.key === 'j' || e.key === 'J')
                  ) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                  }
                  
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
                }}
                className="w-full px-3 py-2 border rounded"
                placeholder="Escanea o ingresa código (opcional)"
                data-barcode-scanner="enabled"
                autoFocus={mostrarFormulario}
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
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
              <input
                ref={categoriaInputRef}
                type="text"
                value={categoriaInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setCategoriaInput(value);
                  
                  // Filtrar sugerencias
                  if (value.trim()) {
                    const filtered = categorias.filter(cat =>
                      cat.nombre.toLowerCase().includes(value.toLowerCase())
                    );
                    setCategoriaSuggestions(filtered);
                    setShowCategoriaSuggestions(true);
                  } else {
                    setCategoriaSuggestions([]);
                    setShowCategoriaSuggestions(false);
                  }
                  
                  // Si no hay coincidencias, limpiar categoria_id
                  if (!categorias.find(cat => cat.nombre.toLowerCase() === value.toLowerCase())) {
                    setFormData({
                      ...formData,
                      categoria_id: '',
                      categoria: value,
                    });
                  }
                }}
                onFocus={() => {
                  if (categoriaInput.trim()) {
                    const filtered = categorias.filter(cat =>
                      cat.nombre.toLowerCase().includes(categoriaInput.toLowerCase())
                    );
                    setCategoriaSuggestions(filtered);
                    setShowCategoriaSuggestions(true);
                  }
                }}
                className="w-full px-3 py-2 border rounded"
                placeholder="Escribe el nombre de la categoría..."
              />
              {showCategoriaSuggestions && categoriaSuggestions.length > 0 && (
                <div
                  ref={categoriaSuggestionsRef}
                  className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-auto"
                >
                  {categoriaSuggestions.map((cat) => (
                    <div
                      key={cat.id}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                      onClick={() => {
                        setCategoriaInput(cat.nombre);
                        setFormData({
                          ...formData,
                          categoria_id: cat.id,
                          categoria: cat.nombre,
                        });
                        setShowCategoriaSuggestions(false);
                      }}
                    >
                      <div className="font-medium text-slate-900">{cat.nombre}</div>
                    </div>
                  ))}
                </div>
              )}
              {categoriaInput && !categorias.find(cat => cat.nombre.toLowerCase() === categoriaInput.toLowerCase()) && (
                <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                  <p className="font-medium mb-1">💡 Categoría nueva</p>
                  <p>Esta categoría se creará automáticamente al guardar el producto.</p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Marca</label>
              <input
                type="text"
                value={formData.marca}
                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="Ej: Apple, Samsung, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label>
              <input
                type="text"
                value={formData.modelo}
                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="Ej: iPhone 13, Galaxy S24, etc."
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
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <button
              onClick={guardarProducto}
              className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              disabled={loading || !formData.nombre}
            >
              Guardar
            </button>
            <button
              onClick={() => {
                setMostrarFormulario(false);
                setProductoEditando(null);
              }}
              className="w-full sm:w-auto px-6 py-2 bg-slate-400 text-white rounded-lg font-medium hover:bg-slate-500"
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
                <th className="text-left px-2 sm:px-3 py-3 text-xs sm:text-sm font-medium text-slate-700">Código</th>
                <th className="text-left px-2 sm:px-3 py-3 text-xs sm:text-sm font-medium text-slate-700">Nombre</th>
                <th className="text-left px-2 sm:px-3 py-3 text-xs sm:text-sm font-medium text-slate-700 hidden md:table-cell">Categoría</th>
                <th className="text-right px-2 sm:px-3 py-3 text-xs sm:text-sm font-medium text-slate-700">Precio</th>
                <th className="text-right px-2 sm:px-3 py-3 text-xs sm:text-sm font-medium text-slate-700">Stock</th>
                <th className="text-center px-2 sm:px-3 py-3 text-xs sm:text-sm font-medium text-slate-700">Acciones</th>
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
                  <td className="px-2 sm:px-3 py-3 text-sm text-slate-600 truncate max-w-[100px] sm:max-w-none">{producto.codigo_barras || '-'}</td>
                  <td className="px-2 sm:px-3 py-3 text-sm font-medium text-slate-800 truncate max-w-[150px] sm:max-w-none">{producto.nombre}</td>
                  <td className="px-2 sm:px-3 py-3 text-sm text-slate-600 hidden md:table-cell truncate max-w-[120px]">
                    {producto.categoria || '-'}
                    {producto.marca && producto.modelo && (
                      <span className="block text-xs text-slate-400">{producto.marca} {producto.modelo}</span>
                    )}
                  </td>
                  <td className="px-2 sm:px-3 py-3 text-sm text-right font-medium text-slate-800 whitespace-nowrap">
                    {formatCurrency(producto.precio_venta)}
                  </td>
                  <td className="px-2 sm:px-3 py-3 text-sm text-right">
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
                  <td className="px-2 sm:px-3 py-3">
                    <div className="flex gap-1 sm:gap-2 justify-center flex-wrap">
                      <button
                        onClick={() => {
                          const cantidad = prompt(
                            `Agregar stock a: ${producto.nombre}\nStock actual: ${producto.stock_actual}`
                          );
                          if (cantidad && !isNaN(parseInt(cantidad))) {
                            agregarStock(producto, parseInt(cantidad));
                          }
                        }}
                        className="px-2 sm:px-3 py-1 bg-blue-500 text-white rounded text-xs sm:text-sm hover:bg-blue-600 whitespace-nowrap"
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
                            categoria_id: producto.categoria_id || '',
                            marca: producto.marca || '',
                            modelo: producto.modelo || '',
                            precio_venta: producto.precio_venta.toString(),
                            costo: producto.costo.toString(),
                            stock_actual: producto.stock_actual.toString(),
                            stock_minimo: producto.stock_minimo.toString(),
                          });
                          setMostrarFormulario(true);
                        }}
                        className="px-2 sm:px-3 py-1 bg-slate-500 text-white rounded text-xs sm:text-sm hover:bg-slate-600 whitespace-nowrap"
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
        </>
      )}
    </div>
  );
}
