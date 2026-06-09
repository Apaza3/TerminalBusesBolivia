# Terminal Buses Bolivia — Estado del Proyecto

> **Rama base activa:** `feature/supabase-ui-fix` (stack: React 19 + Supabase real)
> **Stack:** React 19 (frontend) · Supabase (DB + Auth) · Express + WebSocket (backend)
> **Build:** ✅ Compila sin errores

---

## 🌿 ESTRATEGIA DE RAMAS (actual)

```
main
└── feature/supabase-ui-fix          ← base actual — auth real + panel admin
    └── mejorando_diseño_pt2         ← rama activa — cambios de diseño UI/UX
```

**Reglas — OBLIGATORIO seguir:**
1. Nunca commitear directo a `main` ni a `feature/supabase-ui-fix`.
2. **NO crear ramas nuevas** sin autorización explícita del usuario. Todos los cambios van a la rama activa actual (`mejorando_diseño_pt2`).
3. Commits solo cuando el cambio es funcional y compila sin errores (no WIP).
4. Merge siempre con `--no-ff` y solo con autorización explícita del usuario.
5. Cherry-pick nunca como estrategia principal.
6. **Rama activa actual: `mejorando_diseño_pt2`** — quedarse aquí hasta que el usuario indique cambio.

---
