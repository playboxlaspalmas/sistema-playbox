import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { CategoriaAccesorio, User } from '@/types';

interface CategoriasAccesoriosProps {
  user: User;
}

export default function CategoriasAccesorios({ user }: CategoriasAccesoriosProps) {
  const [categorias, setCategorias] = useState<CategoriaAccesorio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState<CategoriaAccesorio | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
  });

  const cargarCategorias = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('categorias_accesorios')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;

      setCategorias(data || []);
    } catch (err: any) {
      console.error('Error cargando categorías:', err);
      setError('Error al cargar categorías: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarCategorias();
  }, [cargarCategorias]);

  const abrirFormulario = (categoria?: CategoriaAccesorio) => {
    if (categoria) {
      setCategoriaEditando(categoria);
      setFormData({
        nombre: categoria.nombre,
        descripcion: categoria.descripcion || '',
      });
    } else {
      setCategoriaEditando(null);
      setFormData({
        nombre: '',
        descripcion: '',
      });
    }
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    setMostrarFormulario(false);
    setCategoriaEditando(null);
    setFormData({
      nombre: '',
      descripcion: '',
    });
    setError(null);
  };

  const guardarCategoria = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!formData.nombre.trim()) {
        setError('El nombre de la categoría es obligatorio');
        setLoading(false);
        return;
      }

      const datos = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || null,
        activa: true,
      };

      if (categoriaEditando) {
        const { error } = await supabase
          .from('categorias_accesorios')
          .update(datos)
          .eq('id', categoriaEditando.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categorias_accesorios')
          .insert(datos);

        if (error) throw error;
      }

      cerrarFormulario();
      cargarCategorias();
    } catch (err: any) {
      console.error('Error guardando categoría:', err);
      setError('Error al guardar categoría: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const toggleActiva = async (categoria: CategoriaAccesorio) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('categorias_accesorios')
        .update({ activa: !categoria.activa })
        .eq('id', categoria.id);

      if (error) throw error;
      cargarCategorias();
    } catch (err: any) {
      console.error('Error actualizando categoría:', err);
      setError('Error al actualizar categoría: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Categorías de Accesorios</h2>
        <button
          onClick={() => abrirFormulario()}
          className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors shadow-sm"
        >
          ➕ Nueva Categoría
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading && categorias.length === 0 ? (
        <p className="text-gray-600">Cargando categorías...</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categorias.map((categoria) => (
                <tr key={categoria.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {categoria.nombre}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {categoria.descripcion || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        categoria.activa
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {categoria.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => abrirFormulario(categoria)}
                      className="text-brand hover:text-brand-dark mr-3"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => toggleActiva(categoria)}
                      className={`${
                        categoria.activa
                          ? 'text-red-600 hover:text-red-700'
                          : 'text-green-600 hover:text-green-700'
                      }`}
                    >
                      {categoria.activa ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de formulario */}
      {mostrarFormulario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {categoriaEditando ? 'Editar Categoría' : 'Nueva Categoría'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand focus:border-brand"
                  placeholder="Ej: Fundas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand focus:border-brand"
                  rows={3}
                  placeholder="Descripción opcional"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={cerrarFormulario}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardarCategoria}
                disabled={loading}
                className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 shadow-sm"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
