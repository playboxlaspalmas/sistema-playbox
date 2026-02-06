import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCLP } from '@/lib/currency';
import type { Dispositivo, Repuesto, User } from '@/types';

interface DispositivosRepuestosProps {
  user: User;
}

export default function DispositivosRepuestos({ user }: DispositivosRepuestosProps) {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarFormularioDispositivo, setMostrarFormularioDispositivo] = useState(false);
  const [mostrarFormularioRepuesto, setMostrarFormularioRepuesto] = useState(false);
  const [dispositivoEditando, setDispositivoEditando] = useState<Dispositivo | null>(null);
  const [repuestoEditando, setRepuestoEditando] = useState<Repuesto | null>(null);
  const [dispositivoSeleccionado, setDispositivoSeleccionado] = useState<string | null>(null);
  
  const [formDataDispositivo, setFormDataDispositivo] = useState({
    marca: '',
    modelo: '',
    tipo_dispositivo: '' as Dispositivo['tipo_dispositivo'],
  });

  const [formDataRepuesto, setFormDataRepuesto] = useState({
    dispositivo_id: '',
    nombre: '',
    precio_costo: '',
    precio_venta: '',
    stock_actual: '',
    stock_minimo: '',
  });
  const [mostrarCrearDispositivo, setMostrarCrearDispositivo] = useState(false);
  const [nuevoDispositivo, setNuevoDispositivo] = useState({
    marca: '',
    modelo: '',
    tipo_dispositivo: '' as Dispositivo['tipo_dispositivo'],
  });
  const [busquedaRepuesto, setBusquedaRepuesto] = useState('');
  const [repuestosFiltradosPorBusqueda, setRepuestosFiltradosPorBusqueda] = useState<Repuesto[]>([]);

  const cargarDispositivos = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dispositivos')
        .select('*')
        .order('marca', { ascending: true })
        .order('modelo', { ascending: true });

      if (error) throw error;
      setDispositivos(data || []);
    } catch (err: any) {
      console.error('Error cargando dispositivos:', err);
      setError('Error al cargar dispositivos: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarRepuestos = useCallback(async (dispositivoId?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('repuestos')
        .select('*, dispositivo:dispositivos(*)')
        .order('nombre', { ascending: true });

      if (dispositivoId) {
        query = query.eq('dispositivo_id', dispositivoId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRepuestos(data || []);
    } catch (err: any) {
      console.error('Error cargando repuestos:', err);
      setError('Error al cargar repuestos: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDispositivos();
    cargarRepuestos();
  }, [cargarDispositivos, cargarRepuestos]);

  const abrirFormularioDispositivo = (dispositivo?: Dispositivo) => {
    if (dispositivo) {
      setDispositivoEditando(dispositivo);
      setFormDataDispositivo({
        marca: dispositivo.marca,
        modelo: dispositivo.modelo,
        tipo_dispositivo: dispositivo.tipo_dispositivo || '',
      });
    } else {
      setDispositivoEditando(null);
      setFormDataDispositivo({
        marca: '',
        modelo: '',
        tipo_dispositivo: '',
      });
    }
    setMostrarFormularioDispositivo(true);
  };

  const abrirFormularioRepuesto = (dispositivoId?: string, repuesto?: Repuesto) => {
    if (repuesto) {
      setRepuestoEditando(repuesto);
      setFormDataRepuesto({
        dispositivo_id: repuesto.dispositivo_id,
        nombre: repuesto.nombre,
        precio_costo: repuesto.precio_costo.toString(),
        precio_venta: repuesto.precio_venta.toString(),
        stock_actual: repuesto.stock_actual.toString(),
        stock_minimo: repuesto.stock_minimo.toString(),
      });
    } else {
      setRepuestoEditando(null);
      setFormDataRepuesto({
        dispositivo_id: dispositivoId || '',
        nombre: '',
        precio_costo: '',
        precio_venta: '',
        stock_actual: '',
        stock_minimo: '',
      });
    }
    setMostrarFormularioRepuesto(true);
  };

  const guardarDispositivo = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!formDataDispositivo.marca.trim() || !formDataDispositivo.modelo.trim()) {
        setError('Marca y modelo son obligatorios');
        setLoading(false);
        return;
      }

      const datos = {
        marca: formDataDispositivo.marca.trim(),
        modelo: formDataDispositivo.modelo.trim(),
        tipo_dispositivo: formDataDispositivo.tipo_dispositivo || null,
        activo: true,
      };

      if (dispositivoEditando) {
        const { error } = await supabase
          .from('dispositivos')
          .update(datos)
          .eq('id', dispositivoEditando.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dispositivos')
          .insert(datos);

        if (error) throw error;
      }

      setMostrarFormularioDispositivo(false);
      setDispositivoEditando(null);
      cargarDispositivos();
    } catch (err: any) {
      console.error('Error guardando dispositivo:', err);
      setError('Error al guardar dispositivo: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const guardarRepuesto = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!formDataRepuesto.dispositivo_id || !formDataRepuesto.nombre.trim()) {
        setError('Dispositivo y nombre son obligatorios');
        setLoading(false);
        return;
      }

      const datos = {
        dispositivo_id: formDataRepuesto.dispositivo_id,
        nombre: formDataRepuesto.nombre.trim(),
        precio_costo: parseFloat(formDataRepuesto.precio_costo) || 0,
        precio_venta: parseFloat(formDataRepuesto.precio_venta) || 0,
        stock_actual: parseInt(formDataRepuesto.stock_actual) || 0,
        stock_minimo: parseInt(formDataRepuesto.stock_minimo) || 0,
        activo: true,
      };

      if (repuestoEditando) {
        const { error } = await supabase
          .from('repuestos')
          .update(datos)
          .eq('id', repuestoEditando.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('repuestos')
          .insert(datos);

        if (error) throw error;
      }

      setMostrarFormularioRepuesto(false);
      setRepuestoEditando(null);
      cargarRepuestos();
    } catch (err: any) {
      console.error('Error guardando repuesto:', err);
      setError('Error al guardar repuesto: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const agregarStockRepuesto = async (repuesto: Repuesto, cantidad: number) => {
    try {
      setLoading(true);
      const nuevaCantidad = repuesto.stock_actual + cantidad;

      const { error } = await supabase
        .from('repuestos')
        .update({ stock_actual: nuevaCantidad })
        .eq('id', repuesto.id);

      if (error) throw error;

      // Registrar movimiento
      await supabase
        .from('repuestos_movimientos')
        .insert({
          repuesto_id: repuesto.id,
          tipo_movimiento: cantidad > 0 ? 'compra' : 'ajuste',
          cantidad,
          cantidad_anterior: repuesto.stock_actual,
          cantidad_nueva: nuevaCantidad,
          usuario_id: user.id,
          observaciones: cantidad > 0 ? 'Carga de stock' : 'Ajuste de stock',
        });

      cargarRepuestos();
    } catch (err: any) {
      console.error('Error agregando stock:', err);
      setError('Error al actualizar stock: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  // Filtrar repuestos según dispositivo seleccionado y búsqueda
  const repuestosFiltrados = (() => {
    // Si hay búsqueda activa y resultados filtrados, usar esos
    if (busquedaRepuesto.length >= 2) {
      if (repuestosFiltradosPorBusqueda.length > 0) {
        return repuestosFiltradosPorBusqueda;
      }
      // Si hay búsqueda pero no resultados filtrados aún, filtrar sobre repuestos actuales
      const busquedaLower = busquedaRepuesto.toLowerCase();
      return repuestos.filter(r => {
        const dispositivo = dispositivos.find(d => d.id === r.dispositivo_id);
        const textoCompleto = `${dispositivo?.marca || ''} ${dispositivo?.modelo || ''} ${r.nombre}`.toLowerCase();
        return textoCompleto.includes(busquedaLower) || r.nombre.toLowerCase().includes(busquedaLower);
      });
    }
    
    // Si hay dispositivo seleccionado pero no búsqueda, filtrar por dispositivo
    if (dispositivoSeleccionado) {
      return repuestos.filter(r => r.dispositivo_id === dispositivoSeleccionado);
    }
    
    // Si no hay filtros, mostrar todos
    return repuestos;
  })();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Dispositivos y Repuestos</h2>
        <div className="flex gap-2">
          <button
            onClick={() => abrirFormularioRepuesto()}
            className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors shadow-sm"
          >
            ➕ Nuevo Repuesto
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Búsqueda de repuestos por texto completo */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Buscar Repuesto (por marca, modelo o nombre)
        </label>
        <input
          type="text"
          placeholder="Ej: batería de iPhone 13 Pro Max"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand focus:border-brand"
          value={busquedaRepuesto}
          onChange={(e) => {
            const busqueda = e.target.value.trim();
            setBusquedaRepuesto(busqueda);
            
            if (busqueda.length >= 2) {
              const busquedaLower = busqueda.toLowerCase();
              // Buscar en dispositivos primero
              const dispositivoEncontrado = dispositivos.find(d => {
                const textoDispositivo = `${d.marca} ${d.modelo}`.toLowerCase();
                return textoDispositivo.includes(busquedaLower) ||
                       busquedaLower.includes(d.marca.toLowerCase()) ||
                       busquedaLower.includes(d.modelo.toLowerCase());
              });
              
              if (dispositivoEncontrado) {
                setDispositivoSeleccionado(dispositivoEncontrado.id);
                // Cargar repuestos del dispositivo encontrado
                cargarRepuestos(dispositivoEncontrado.id);
              } else {
                // Buscar repuestos por nombre que contengan la búsqueda en todos los repuestos
                const filtrados = repuestos.filter(r => {
                  const dispositivo = dispositivos.find(d => d.id === r.dispositivo_id);
                  const textoCompleto = `${dispositivo?.marca || ''} ${dispositivo?.modelo || ''} ${r.nombre}`.toLowerCase();
                  return textoCompleto.includes(busquedaLower) || r.nombre.toLowerCase().includes(busquedaLower);
                });
                setRepuestosFiltradosPorBusqueda(filtrados);
                setDispositivoSeleccionado(null);
              }
            } else {
              setRepuestosFiltradosPorBusqueda([]);
              if (busqueda.length === 0) {
                setDispositivoSeleccionado(null);
              }
            }
          }}
        />
      </div>

      {/* Lista de dispositivos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <h3 className="text-lg font-semibold text-gray-900 p-4 border-b border-gray-200">Dispositivos</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marca</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Modelo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dispositivos.map((dispositivo) => (
                <tr key={dispositivo.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {dispositivo.marca}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {dispositivo.modelo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {dispositivo.tipo_dispositivo || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => abrirFormularioDispositivo(dispositivo)}
                      className="text-brand hover:text-brand-dark mr-3"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => abrirFormularioRepuesto(dispositivo.id)}
                      className="text-brand hover:text-brand-dark"
                    >
                      Agregar Repuesto
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lista de repuestos */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <h3 className="text-lg font-semibold text-gray-900 p-4 border-b border-gray-200">Repuestos</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dispositivo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Repuesto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio Costo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio Venta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {repuestosFiltrados.map((repuesto) => {
                const dispositivo = repuesto.dispositivo || dispositivos.find(d => d.id === repuesto.dispositivo_id);
                return (
                  <tr key={repuesto.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {dispositivo ? `${dispositivo.marca} ${dispositivo.modelo}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {repuesto.nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatCLP(repuesto.precio_costo)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatCLP(repuesto.precio_venta)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className={repuesto.stock_actual <= repuesto.stock_minimo ? 'text-red-600 font-bold' : ''}>
                        {repuesto.stock_actual}
                      </span>
                      {repuesto.stock_minimo > 0 && (
                        <span className="text-gray-400 text-xs ml-1">
                          (mín: {repuesto.stock_minimo})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => abrirFormularioRepuesto(undefined, repuesto)}
                        className="text-brand hover:text-brand-dark mr-2"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => agregarStockRepuesto(repuesto, 1)}
                        className="text-green-600 hover:text-green-700 mr-2"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => agregarStockRepuesto(repuesto, -1)}
                        className="text-red-600 hover:text-red-700"
                      >
                        -1
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal formulario dispositivo */}
      {mostrarFormularioDispositivo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {dispositivoEditando ? 'Editar Dispositivo' : 'Nuevo Dispositivo'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
                <input
                  type="text"
                  value={formDataDispositivo.marca}
                  onChange={(e) => setFormDataDispositivo({ ...formDataDispositivo, marca: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo *</label>
                <input
                  type="text"
                  value={formDataDispositivo.modelo}
                  onChange={(e) => setFormDataDispositivo({ ...formDataDispositivo, modelo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Dispositivo</label>
                <select
                  value={formDataDispositivo.tipo_dispositivo || ''}
                  onChange={(e) => setFormDataDispositivo({ ...formDataDispositivo, tipo_dispositivo: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand focus:border-brand"
                >
                  <option value="">Seleccionar...</option>
                  <option value="iphone">iPhone</option>
                  <option value="ipad">iPad</option>
                  <option value="macbook">MacBook</option>
                  <option value="apple_watch">Apple Watch</option>
                  <option value="android">Android</option>
                  <option value="laptop">Laptop</option>
                  <option value="tablet">Tablet</option>
                  <option value="consola">Consola</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setMostrarFormularioDispositivo(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardarDispositivo}
                disabled={loading}
                className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 shadow-sm"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal formulario repuesto */}
      {mostrarFormularioRepuesto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {repuestoEditando ? 'Editar Repuesto' : 'Nuevo Repuesto'}
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Dispositivo *</label>
                  <button
                    type="button"
                    onClick={() => setMostrarCrearDispositivo(!mostrarCrearDispositivo)}
                    className="text-xs text-brand hover:text-brand-dark font-medium"
                  >
                    {mostrarCrearDispositivo ? '✕ Cancelar' : '+ Nuevo Dispositivo'}
                  </button>
                </div>
                {!mostrarCrearDispositivo ? (
                  <select
                    value={formDataRepuesto.dispositivo_id}
                    onChange={(e) => setFormDataRepuesto({ ...formDataRepuesto, dispositivo_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand focus:border-brand"
                    disabled={!!repuestoEditando}
                  >
                    <option value="">Seleccionar...</option>
                    {dispositivos.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.marca} {d.modelo}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Marca *</label>
                      <input
                        type="text"
                        value={nuevoDispositivo.marca}
                        onChange={(e) => setNuevoDispositivo({ ...nuevoDispositivo, marca: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                        placeholder="Ej: Apple"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Modelo *</label>
                      <input
                        type="text"
                        value={nuevoDispositivo.modelo}
                        onChange={(e) => setNuevoDispositivo({ ...nuevoDispositivo, modelo: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                        placeholder="Ej: iPhone 13 Pro Max"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                      <select
                        value={nuevoDispositivo.tipo_dispositivo || ''}
                        onChange={(e) => setNuevoDispositivo({ ...nuevoDispositivo, tipo_dispositivo: e.target.value as any })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="iphone">iPhone</option>
                        <option value="ipad">iPad</option>
                        <option value="macbook">MacBook</option>
                        <option value="apple_watch">Apple Watch</option>
                        <option value="android">Android</option>
                        <option value="laptop">Laptop</option>
                        <option value="tablet">Tablet</option>
                        <option value="consola">Consola</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!nuevoDispositivo.marca.trim() || !nuevoDispositivo.modelo.trim()) {
                          setError('Marca y modelo son obligatorios');
                          return;
                        }
                        try {
                          setLoading(true);
                          const { data, error } = await supabase
                            .from('dispositivos')
                            .insert({
                              marca: nuevoDispositivo.marca.trim(),
                              modelo: nuevoDispositivo.modelo.trim(),
                              tipo_dispositivo: nuevoDispositivo.tipo_dispositivo || null,
                              activo: true,
                            })
                            .select()
                            .single();

                          if (error) throw error;

                          await cargarDispositivos();
                          setFormDataRepuesto({ ...formDataRepuesto, dispositivo_id: data.id });
                          setNuevoDispositivo({ marca: '', modelo: '', tipo_dispositivo: '' });
                          setMostrarCrearDispositivo(false);
                          setError(null);
                        } catch (err: any) {
                          console.error('Error creando dispositivo:', err);
                          setError('Error al crear dispositivo: ' + (err.message || 'Error desconocido'));
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading || !nuevoDispositivo.marca.trim() || !nuevoDispositivo.modelo.trim()}
                      className="w-full px-3 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 text-sm font-medium"
                    >
                      {loading ? 'Creando...' : 'Crear y Seleccionar'}
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Repuesto *</label>
                <input
                  type="text"
                  value={formDataRepuesto.nombre}
                  onChange={(e) => setFormDataRepuesto({ ...formDataRepuesto, nombre: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand focus:border-brand"
                  placeholder="Ej: Pantalla LCD"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Costo</label>
                  <input
                    type="number"
                    value={formDataRepuesto.precio_costo}
                    onChange={(e) => setFormDataRepuesto({ ...formDataRepuesto, precio_costo: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Venta</label>
                  <input
                    type="number"
                    value={formDataRepuesto.precio_venta}
                    onChange={(e) => setFormDataRepuesto({ ...formDataRepuesto, precio_venta: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand focus:border-brand"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Actual</label>
                  <input
                    type="number"
                    value={formDataRepuesto.stock_actual}
                    onChange={(e) => setFormDataRepuesto({ ...formDataRepuesto, stock_actual: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    value={formDataRepuesto.stock_minimo}
                    onChange={(e) => setFormDataRepuesto({ ...formDataRepuesto, stock_minimo: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand focus:border-brand"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setMostrarFormularioRepuesto(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardarRepuesto}
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
