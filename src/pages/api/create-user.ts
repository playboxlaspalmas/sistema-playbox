import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string;
const serviceRoleKey =
  (import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string) ||
  (import.meta.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY as string);

export const POST: APIRoute = async ({ request }) => {
  try {
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Supabase envs no configuradas" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "";
    if (!token) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: currentUser, error: currentUserError } = await adminClient
      .from("users")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (currentUserError || !currentUser) {
      return new Response(JSON.stringify({ error: "Usuario no autorizado" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (currentUser.role !== "admin") {
      return new Response(JSON.stringify({ error: "Permisos insuficientes" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();
    const role = String(body.role || "technician").trim();
    const sucursal_id = body.sucursal_id ? String(body.sucursal_id) : null;

    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ error: "Email, contraseña y nombre son obligatorios" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
    });

    if (createError || !createdUser.user) {
      return new Response(JSON.stringify({ error: createError?.message || "Error creando usuario" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { error: insertError } = await adminClient.from("users").insert({
      id: createdUser.user.id,
      email,
      name,
      role,
      sucursal_id,
    });

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message || "Error guardando usuario" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
