import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCLP } from '@/lib/currency';
import type { User, CategoriaAccesorio } from '@/types';

interface BulkStockManagerProps {
  user: User;
}

interface ProductoBulk {
  nombre: string;
  marca: string;
  modelo: string;
  codigo_barras: string;
  categoria_id: string;
  precio_costo: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
}

export default function BulkStockManager({ user }: BulkStockManagerProps) {
  const [categorias, setCategorias] = useState<CategoriaAccesorio[]>([]);
  const [productos, setProductos] = useState<ProductoBulk[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  useEffect(() => {
    cargarCategorias();
  }, []);

  async function cargarCategorias() {
    try {
      const { data, error } = await supabase
        .from('categorias_accesorios')
        .select('*')
        .eq('activa', true)
        .order('nombre');

      if (error) throw error;
      setCategorias(data || []);
    } catch (err: any) {
      console.error('Error cargando categorías:', err);
      setError('Error al cargar categorías: ' + (err.message || 'Error desconocido'));
    }
  }

  function agregarProducto() {
    setProductos([
      ...productos,
      {
        nombre: '',
        marca: '',
        modelo: '',
        codigo_barras: '',
        categoria_id: categorias[0]?.id || '',
        precio_costo: 0,
        precio_venta: 0,
        stock_actual: 0,
        stock_minimo: 0,
      },
    ]);
  }

  function actualizarProducto(index: number, campo: keyof ProductoBulk, valor: any) {
    const nuevosProductos = [...productos];
    nuevosProductos[index] = { ...nuevosProductos[index], [campo]: valor };
    setProductos(nuevosProductos);
  }

  function eliminarProducto(index: number) {
    setProductos(productos.filter((_, i) => i !== index));
  }

  async function guardarProductos() {
    if (productos.length === 0) {
      setError('Agrega al menos un producto');
      return;
    }

    // Validar productos
    for (let i = 0; i < productos.length; i++) {
      const p = productos[i];
      if (!p.nombre.trim()) {
        setError(`El producto ${i + 1} debe tener un nombre`);
        return;
      }
      if (!p.categoria_id) {
        setError(`El producto ${i + 1} debe tener una categoría`);
        return;
      }
      if (p.precio_venta <= 0) {
        setError(`El producto ${i + 1} debe tener un precio de venta mayor a 0`);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const productosParaInsertar = productos.map((p) => ({
        nombre: p.nombre.trim(),
        marca: p.marca.trim() || null,
        modelo: p.modelo.trim() || null,
        codigo_barras: p.codigo_barras.trim() || null,
        categoria_id: p.categoria_id,
        tipo: 'accesorio' as const,
        precio_costo: p.precio_costo || 0,
        precio_venta: p.precio_venta,
        stock_actual: p.stock_actual || 0,
        stock_minimo: p.stock_minimo || 0,
        activo: true,
        sucursal_id: user.sucursal_id || null,
      }));

      const { error: insertError } = await supabase
        .from('productos')
        .insert(productosParaInsertar);

      if (insertError) throw insertError;

      setSuccess(`Se guardaron ${productos.length} productos correctamente`);
      setProductos([]);
      setTimeout(() => {
        setMostrarFormulario(false);
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      console.error('Error guardando productos:', err);
      setError('Error al guardar productos: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }

  function importarDesdeCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        const nuevosProductos: ProductoBulk[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          const producto: ProductoBulk = {
            nombre: values[headers.indexOf('nombre')]?.trim() || '',
            marca: values[headers.indexOf('marca')]?.trim() || '',
            modelo: values[headers.indexOf('modelo')]?.trim() || '',
            codigo_barras: values[headers.indexOf('codigo_barras')]?.trim() || '',
            categoria_id: categorias[0]?.id || '',
            precio_costo: parseFloat(values[headers.indexOf('precio_costo')] || '0') || 0,
            precio_venta: parseFloat(values[headers.indexOf('precio_venta')] || '0') || 0,
            stock_actual: parseInt(values[headers.indexOf('stock_actual')] || '0') || 0,
            stock_minimo: parseInt(values[headers.indexOf('stock_minimo')] || '0') || 0,
          };
          nuevosProductos.push(producto);
        }

        setProductos(nuevosProductos);
        setSuccess(`Se importaron ${nuevosProductos.length} productos desde CSV`);
      } catch (err: any) {
        setError('Error al importar CSV: ' + (err.message || 'Error desconocido'));
      }
    };
    input.click();
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Gestión Masiva de Stock</h2>
        <div className="flex gap-2">
          <button
            onClick={importarDesdeCSV}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            📥 Importar CSV
          </button>
          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors shadow-sm"
          >
            {mostrarFormulario ? 'Ocultar' : '➕ Agregar Productos'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      {mostrarFormulario && (
        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Formato CSV esperado:</strong> nombre, marca, modelo, codigo_barras, precio_costo, precio_venta, stock_actual, stock_minimo
            </p>
            <p className="text-sm text-gray-600">
              Puedes agregar productos manualmente o importar desde un archivo CSV.
            </p>
          </div>

          {productos.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre *</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Marca</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Modelo</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Categoría *</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">P. Costo</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">P. Venta *</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mínimo</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productos.map((producto, index) => (
                    <tr key={index}>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={producto.nombre}
                          onChange={(e) => actualizarProducto(index, 'nombre', e.target.value)}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                          placeholder="Nombre"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={producto.marca}
                          onChange={(e) => actualizarProducto(index, 'marca', e.target.value)}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                          placeholder="Marca"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={producto.modelo}
                          onChange={(e) => actualizarProducto(index, 'modelo', e.target.value)}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                          placeholder="Modelo"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={producto.codigo_barras}
                          onChange={(e) => actualizarProducto(index, 'codigo_barras', e.target.value)}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                          placeholder="Código"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={producto.categoria_id}
                          onChange={(e) => actualizarProducto(index, 'categoria_id', e.target.value)}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                        >
                          {categorias.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.nombre}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={producto.precio_costo}
                          onChange={(e) => actualizarProducto(index, 'precio_costo', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                          placeholder="0"
                          min="0"
                          step="100"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={producto.precio_venta}
                          onChange={(e) => actualizarProducto(index, 'precio_venta', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                          placeholder="0"
                          min="0"
                          step="100"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={producto.stock_actual}
                          onChange={(e) => actualizarProducto(index, 'stock_actual', parseInt(e.target.value) || 0)}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                          placeholder="0"
                          min="0"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={producto.stock_minimo}
                          onChange={(e) => actualizarProducto(index, 'stock_minimo', parseInt(e.target.value) || 0)}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                          placeholder="0"
                          min="0"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => eliminarProducto(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={agregarProducto}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ➕ Agregar Fila
            </button>
            <button
              onClick={guardarProductos}
              disabled={loading || productos.length === 0}
              className="flex-1 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? 'Guardando...' : `Guardar ${productos.length} Productos`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
