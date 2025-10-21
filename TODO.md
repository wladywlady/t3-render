# Checklist de avance – Tarea 3

## ✅ Completado
- ✅ Análisis del enunciado, definición de arquitectura y plan según rúbrica.
- ✅ Pipeline de datos configurado (scripts Python con manuales ES-MX, limpieza, chunking).
- ✅ Dataset compilado (`data/compiled/manuales_compilados.jsonl`) y subido a Nomic Atlas.
- ✅ Backend Express (TypeScript) con integración a Nomic (`projection_id: 10d83d71-bad9-4771-8068-af291dd04a40`) y al LLM `integracion` en `https://asteroide.ing.uc.cl`.
- ✅ Frontend React + Tailwind (Vite) con chat, selector de modelo, referencias y fragmentos.
- ✅ Builds verificados: `web/dist` y `server/dist` se generan correctamente. Express sirve el frontend compilado.

## 🟡 Pendiente / Próximos pasos
- [x] Crear Dockerfile y/o configuración (`render.yaml`) para desplegar backend + frontend en Render.
- [ ] Configurar variables de entorno en Render (`NOMIC_API_KEY`, `NOMIC_PROJECTION_ID`, `LLM_BASE_URL`, etc.).
- [ ] Ejecutar pruebas manuales end-to-end contra el despliegue (chat → Nomic → LLM) y documentar pasos en README.
- [x] Preparar documentación final del repositorio (README con instrucciones de setup, scripts, endpoints y estructura).
- [ ] Validar presupuesto de tokens en Nomic antes de la entrega.
- [ ] Revisar que los logs y errores manejados sean claros (tanto en frontend como backend) para casos de fallos.
