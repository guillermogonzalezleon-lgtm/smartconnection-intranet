# Prompt: Panel de Agentes IA para InfoPet

## Contexto
Tienes un proyecto InfoPet (panel de gestión para tienda de mascotas) deployado en AWS Amplify.
- **Repo**: github.com/guillermogonzalezleon-lgtm/infopet-next
- **Deploy**: AWS Amplify → infopet.smconnection.cl
- **Stack**: Next.js + TypeScript + Tailwind
- **APIs**: Bsale, Jumpseller, Groq AI, Anthropic (sin saldo)
- **BD**: Supabase proyecto yjjtbwfgtoepsevvkzta (compartido con SmartConnection)

## Lo que quiero

Crear un panel de agentes IA dentro de InfoPet que funcione de dos formas:
1. **Via CLI** (Claude Code) — el agente ejecuta tareas desde terminal
2. **Via UI** (Panel web gráfico) — el agente ejecuta tareas desde el navegador

### Funcionalidades del panel:

**Dashboard IA** (`/admin/agents`)
- Vista compacta tipo sidebar colapsable (no ocupe toda la pantalla)
- Panel flotante tipo chat que se puede minimizar/maximizar
- Muestra recomendaciones automáticas del agente
- Análisis de arquitectura del proyecto en tiempo real
- Análisis de seguridad (vulnerabilidades, dependencias, headers)
- Sugerencias de mejora (código, UX, performance, SEO)

**Agentes disponibles:**
- **Groq** (Llama 3.3 70B) — análisis rápido, gratis, principal
- **Gemini** (gemini-2.0-flash) — SEO, analytics
- **Claude** (cuando tenga saldo) — code review, arquitectura

**Lo que debe hacer el agente:**
1. Analizar la estructura del proyecto y recomendar mejoras
2. Detectar problemas de seguridad (API keys expuestas, headers faltantes, etc.)
3. Sugerir optimizaciones de performance (bundle size, lazy loading, caching)
4. Revisar la arquitectura y proponer refactoring
5. Generar reportes de estado del proyecto
6. Ejecutar tareas: generar código, crear componentes, actualizar APIs

**UX del panel:**
- Botón flotante en esquina inferior derecha (como un chat widget)
- Al hacer click se abre un panel lateral (no nueva página)
- Dentro del panel: tabs para Chat, Recomendaciones, Seguridad, Arquitectura
- Cada recomendación es una card con: título, descripción, severidad, acción
- Las acciones son ejecutables (el agente puede generar código o abrir PRs)
- Streaming de respuestas (mostrar texto mientras se genera)
- Historial de conversaciones guardado en Supabase

**Tablas Supabase necesarias:**
- `infopet_agent_chats`: id, user, messages (jsonb), created_at
- `infopet_agent_recommendations`: id, title, description, category, severity, status, agent, created_at
- `infopet_agent_analysis`: id, type (security/architecture/performance), result (jsonb), score, created_at

**API routes:**
- POST `/api/agent/chat` — chat con streaming
- POST `/api/agent/analyze` — análisis de arquitectura/seguridad/performance
- GET `/api/agent/recommendations` — obtener recomendaciones

**Diseño visual:**
- Tema oscuro matching el admin panel de InfoPet
- Compacto — no ocupa más del 30% de la pantalla
- Minimizable a un botón flotante
- Animaciones suaves de entrada/salida
- Badges de severidad: Critical (rojo), Warning (amber), Info (azul), Success (verde)

## Stack técnico
- Next.js App Router
- TypeScript strict
- Tailwind CSS (o inline styles si hay problemas)
- Supabase REST (sin SDK)
- Groq API como agente principal
- Gemini API para SEO
- Sin dependencias adicionales (no instalar nada nuevo)

## Instrucciones para Claude Code
1. Crear las tablas en Supabase (proyecto yjjtbwfgtoepsevvkzta)
2. Crear los API routes en el proyecto infopet-next
3. Crear el componente AgentPanel como widget flotante
4. Integrar en el layout del admin
5. Probar localmente
6. Push y deploy
