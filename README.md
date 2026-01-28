# Sistema de Gestión de Órdenes de Servicio Técnico

Sistema completo de gestión de órdenes de trabajo para servicio técnico especializado en dispositivos Apple.

## 🚀 Tecnologías

- **Astro** - Framework web
- **React** - UI components
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Supabase** - Backend (Auth + Database)
- **Vercel** - Deployment

## 📋 Requisitos Previos

- Node.js 18+
- npm o yarn
- Cuenta de Supabase
- Cuenta de GitHub (para deploy)
- Cuenta de Vercel (para deploy)

## 🛠️ Instalación Local

1. **Clonar el repositorio:**
```bash
git clone https://github.com/tu-usuario/sistema-gestion-ordenes.git
cd sistema-gestion-ordenes
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar variables de entorno:**
```bash
# Copiar el archivo de ejemplo
cp .env.example .env.local

# Editar .env.local con tus valores reales
# Ver .env.example para más detalles
```

**Variables requeridas:**
- `PUBLIC_SUPABASE_URL` - URL de tu proyecto Supabase
- `PUBLIC_SUPABASE_ANON_KEY` - Anon key de Supabase
- `PUBLIC_SUPABASE_SERVICE_ROLE_KEY` - Service role key (opcional, para operaciones del servidor)
- `RESEND_API_KEY` - API key de Resend (opcional, para envío de emails)

4. **Configurar la base de datos:**
   - Ve a tu proyecto en Supabase
   - Abre el SQL Editor
   - Ejecuta el contenido de `database/schema_completo.sql`

5. **Ejecutar en desarrollo:**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:4321`

## 🚀 Deploy a Vercel

### Opción 1: Deploy desde GitHub (Recomendado)

1. **Subir código a GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/tu-usuario/sistema-gestion-ordenes.git
git push -u origin main
```

2. **Conectar con Vercel:**
   - Ve a [Vercel](https://vercel.com) e inicia sesión
   - Haz clic en **"Add New Project"**
   - Importa tu repositorio de GitHub
   - Vercel detectará automáticamente que es un proyecto Astro

3. **Configurar Variables de Entorno en Vercel:**
   - Ve a **Settings → Environment Variables**
   - Agrega todas las variables de `.env.example`
   - Marca todas para **Production**, **Preview** y **Development**

4. **Deploy:**
   - Haz clic en **"Deploy"**
   - Vercel construirá y desplegará automáticamente

### Opción 2: Deploy con Vercel CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Para producción
vercel --prod
```

**Ver guía completa:** [DEPLOY.md](./DEPLOY.md)

## 📦 Build para Producción

```bash
npm run build
```

El build se generará en `.vercel/output`

## 🧪 Verificar Build Localmente

```bash
npm run preview
```

## 📁 Estructura del Proyecto

```
/
├── src/
│   ├── components/      # Componentes Astro
│   ├── layouts/         # Layouts Astro
│   ├── lib/            # Utilidades (supabase, date, currency, etc.)
│   ├── pages/          # Páginas Astro
│   ├── react/          # Componentes React
│   │   └── components/ # Componentes React individuales
│   ├── styles/         # Estilos globales
│   └── types.ts        # Tipos TypeScript
├── database/
│   └── schema.sql      # Esquema de base de datos
└── public/             # Archivos estáticos
```

## 🗄️ Base de Datos

**IMPORTANTE**: Este sistema está diseñado para usar la **MISMA base de datos de Supabase** que el sistema de reparaciones existente (`sistema-reparaciones`).

### Tablas Nuevas
- `customers` - Clientes
- `services` - Servicios de reparación
- `device_checklist_items` - Items de checklist por tipo de dispositivo
- `work_orders` - Órdenes de trabajo
- `order_services` - Relación orden-servicios
- `order_notes` - Notas de órdenes

### Tablas Compartidas
- `branches` - Sucursales (compartida, se agregan campos nuevos si no existen)
- `users` - Usuarios del sistema (compartida)

**Ver documentación completa**: `database/USO_BASE_DATOS.md` y `INSTRUCCIONES_SETUP.md`

## 👥 Tipos de Usuario

- **Admin**: Acceso completo al sistema
- **Técnico**: Crear y gestionar sus propias órdenes
- **Encargado**: Gestionar su sucursal
- **Recepcionista**: Ver y buscar información

## 📝 Notas

- Las semanas de comisión van de sábado a viernes
- El sistema incluye autocompletado inteligente para dispositivos Apple
- Checklist dinámico según tipo de dispositivo
- Sistema de prioridades con colores
- Generación de PDFs para órdenes
- Integración con WhatsApp

## 🔒 Seguridad

- Row Level Security (RLS) habilitado en Supabase
- Los usuarios solo ven lo que tienen permiso
- Autenticación manejada por Supabase Auth

