# Spa CashFlow

Sistema de punto de venta, arqueo y comisiones para spa.

## 📂 Estructura

- `app.html` — **aplicación en producción** (la que usan las encargadas)
- `mockups/rediseno.html` — rediseño visual aprobado (referencia para futuras migraciones)
- `docs/` — plan de módulos y notas técnicas

## 🌐 URLs

- **Producción:** se configura en Netlify (apunta a `app.html` o `index.html` de rama `main`)
- **Staging / previews:** cada rama genera su propio preview automático en Netlify

## 🧩 Módulos planeados

| # | Módulo | Estado |
|---|---|---|
| 0 | App actual (migrada) | ✅ en `app.html` |
| 1 | Rediseño visual PV + Arqueo + Recibos | 🟡 mockup listo en `mockups/` |
| 2 | Gastos | ⏳ siguiente |
| 3 | Dashboard histórico mejorado | ⏳ pendiente |
| 4 | Cortes consolidados | ⏳ pendiente |
| 5 | Inventario | ⏳ pendiente |

## 🔁 Flujo de trabajo

1. Claude produce cambios en un proyecto aparte
2. Se entrega un ZIP con los archivos modificados
3. Se suben a GitHub vía GitHub Desktop o upload web
4. Netlify detecta el commit y publica automáticamente
5. Ramas = previews de staging; `main` = producción

## 📝 Convenciones

- Una rama por módulo: `feat/gastos`, `feat/dashboard`, etc.
- Un módulo = un PR a `main`
- Mockup antes que código
