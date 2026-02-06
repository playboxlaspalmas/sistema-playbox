import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Verificar si hay sesión activa
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.log("Login - Error al verificar sesión:", error);
        return;
      }
      if (data.user) {
        console.log("Login - Usuario ya autenticado, redirigiendo a dashboard");
        // Esperar un momento antes de redirigir para evitar loops
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 100);
      }
    });
  }, []);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      // Primero verificar si es una sucursal (solo si login_email no es null)
      // IMPORTANTE: Solo verificar si hay login_email, no si hay error
      if (email) {
        const { data: branch, error: branchError } = await supabase
          .from("branches")
          .select("id, name, login_email, password_hash, is_active")
          .eq("login_email", email)
          .maybeSingle();

        // Solo procesar como sucursal si:
        // 1. No hay error en la consulta
        // 2. Se encontró una sucursal
        // 3. La sucursal tiene login_email (no null)
        // 4. La sucursal está activa
        if (!branchError && branch && branch.login_email && branch.is_active && branch.login_email === email) {
          // Es una sucursal - verificar contraseña
          if (!branch.password_hash) {
            setErr("Esta sucursal no tiene contraseña configurada. Contacta al administrador.");
            setLoading(false);
            return;
          }

          // Hashear la contraseña ingresada para comparar
          const hashResponse = await fetch('/api/hash-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pass }),
          });

          if (!hashResponse.ok) {
            throw new Error('Error al verificar la contraseña');
          }

          const { hash } = await hashResponse.json();

          if (hash === branch.password_hash) {
            // Contraseña correcta - guardar sesión de sucursal en localStorage
            const branchSession = {
              type: 'branch',
              branchId: branch.id,
              branchName: branch.name,
              email: branch.login_email,
            };
            localStorage.setItem('branchSession', JSON.stringify(branchSession));
            window.location.href = "/dashboard";
            return;
          } else {
            setErr("Contraseña incorrecta");
            setLoading(false);
            return;
          }
        }
        // Si no es sucursal o hay error, continuar con login normal de usuario
      }

      // Si no es sucursal, intentar login como usuario normal
      console.log("Intentando login como usuario normal:", email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      console.log("Resultado del login:", { data: data?.user?.email, error: error?.message });

      if (error) {
        console.error("Error de autenticación:", error);
        console.error("Detalles del error:", {
          message: error.message,
          status: error.status,
          name: error.name,
        });
        
        // Mensajes más descriptivos según el tipo de error
        if (error.message.includes('Invalid login credentials')) {
          setErr("Credenciales incorrectas. Verifica tu email y contraseña.");
        } else if (error.message.includes('Email not confirmed')) {
          setErr("Email no confirmado. Por favor, confirma tu email desde Supabase Dashboard.");
        } else if (error.status === 400) {
          setErr(`Error de autenticación (400): ${error.message}. Verifica que el usuario existe y está confirmado.`);
        } else {
          setErr(error.message || "Error al iniciar sesión");
        }
      } else {
        // Limpiar sesión de sucursal si existe
        localStorage.removeItem('branchSession');
        window.location.href = "/dashboard";
      }
    } catch (error: any) {
      console.error("Error en login:", error);
      setErr(error.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <form
        onSubmit={onLogin}
        className="max-w-md w-full bg-white border border-gray-200 p-8 rounded-xl space-y-6 shadow-lg"
      >
        <div className="text-center">
          <img 
            src="/logo.png" 
            alt="Playbox Logo" 
            className="h-56 w-auto mx-auto mb-4 object-contain"
          />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sistema de Gestión de Órdenes</h2>
          <p className="text-gray-600">Playbox - Servicio Especializado</p>
        </div>

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {err}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            className="w-full border border-gray-300 bg-white rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña
          </label>
          <div className="relative">
            <input
              className="w-full border border-gray-300 bg-white rounded-lg px-3 py-2 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand hover:bg-brand-dark text-white font-semibold rounded-lg py-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? "Ingresando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}



