# Deploy en Netlify

## Setup inicial (una vez)

1. Ir a [netlify.com](https://netlify.com) y crear cuenta con GitHub
2. "Add new site" → "Import an existing project"
3. Elegir GitHub → seleccionar repo `walgernick-pixel/spa`
4. Configuración:
   - **Branch to deploy:** `main`
   - **Build command:** (vacío)
   - **Publish directory:** (vacío, o `.`)
5. Deploy
6. En 30 segundos hay URL tipo `https://random-name.netlify.app`

## Cambiar nombre de la URL

Site settings → Change site name → algo como `spa-cashflow` → queda `https://spa-cashflow.netlify.app`

## Deploy Previews (staging automático)

Site settings → Build & deploy → Deploy contexts → activar:
- **Deploy previews:** Any pull request
- **Branch deploys:** All

Cada rama y cada PR obtiene su propia URL de preview. Ejemplo:
- `main` → `https://spa-cashflow.netlify.app` (producción)
- rama `feat/gastos` → `https://feat-gastos--spa-cashflow.netlify.app` (preview)

## Dominio propio (opcional, más adelante)

Domain management → Add custom domain → seguir instrucciones de DNS.

## Notas

- Netlify re-publica automático en cada push a GitHub
- No hay que hacer nada manualmente después del setup
- Los preview URLs expiran si borras la rama
