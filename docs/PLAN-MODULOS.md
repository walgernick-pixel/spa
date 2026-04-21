# Plan de módulos — Spa CashFlow

Objetivo: migrar la operación del spa del Excel a una app web, lanzando módulos de forma incremental sin romper lo existente.

## Módulos

### 0 · Base (hecho)
- Auth Supabase
- Perfiles y permisos
- Turnos, colaboradoras, tipos de servicio, monedas
- PV, arqueo básico
- Dashboard histórico básico

### 1 · Rediseño visual (en mockup)
- Pantallas: PV, Arqueo, Recibo consolidado, Dashboard, Lista de turnos, Login, Config colaboradoras
- Paleta: arena / terracota / musgo
- Tipografía: Fraunces (serif titulares) + Geist (UI) + Geist Mono (números)
- **Mockup aprobado por el usuario** — pendiente de migrar a código funcional

### 2 · Gastos ⭐ siguiente
Registro de salidas de caja para cerrar la foto financiera del turno/día/mes.

**Por definir en sesión de planning:**
- Categorías de gasto (sueldos, insumos, servicios, retail, otros)
- Campos: fecha, monto, moneda, categoría, descripción, comprobante (foto?)
- ¿Ligados a turno o independientes?
- ¿Aprobación requerida?
- ¿Quién puede registrar? (permisos)

### 3 · Dashboard histórico mejorado
Gráficas más útiles: ingresos vs gastos, ticket promedio con línea de media, hora pico, top colaboradoras, top servicios.

### 4 · Cortes consolidados
Reporte diario/semanal/mensual que hoy se arma a mano. Exportable a PDF y Excel.

### 5 · Inventario básico
Aceites, cremas, retail. Entradas (compras), salidas (uso en servicios o venta retail), stock actual.

### 6 · Notificaciones
Integración WhatsApp o email para avisos de cierre, descuadres, etc.

## Flujo por módulo

1. **Planning** (chat corto): usuario describe problema + ejemplos reales
2. **Mockup visual** en design canvas
3. **Aprobación del mockup**
4. **Código funcional** en rama nueva
5. **Staging en Netlify** (preview automático)
6. **Pruebas del usuario** con datos reales
7. **Ajustes**
8. **Merge a main** → producción

## Reglas

- Un chat = un módulo (no mezclar contextos)
- Mockup siempre antes de código
- No tocar `app.html` en producción sin pasar por staging
- Cada módulo inicia con: "Estamos trabajando en [módulo], rama `feat/[x]`"
