# 2. Estrategia de Branching para Operaciones (2.5%)

## Modelo elegido: GitOps con rama única + carpetas por entorno

Se adopta un enfoque **GitOps** donde el repositorio de infraestructura (charts de Helm, configuraciones de Kubernetes) se gestiona con una sola rama `main` y la separación de entornos se hace mediante **carpetas**.

---

## Estructura del Repositorio de Infraestructura

```
infrastructure/
├── Chart.yaml
├── values.yaml              ← Valores base / por defecto
├── values-dev.yaml          ← Sobreescrituras para entorno DEV
├── values-staging.yaml      ← Sobreescrituras para entorno STAGING
├── values-prod.yaml         ← Sobreescrituras para entorno PROD
└── templates/
    ├── kafka-deployment.yaml
    ├── kafka-service.yaml
    ├── postgresql-deployment.yaml
    ├── postgresql-pvc.yaml
    └── postgresql-service.yaml
```

---

## Rama Principal

| Rama | Propósito | Protegida |
|------|-----------|-----------|
| `main` | Fuente de verdad única para toda la infraestructura | ✅ Sí |

> **No se usan ramas por entorno** (`dev`, `staging`, `prod`). La diferenciación se logra con archivos `values-<env>.yaml` separados.

---

## Flujo de Trabajo para Cambios de Infraestructura

### Paso a paso:

1. **Crear rama temporal** desde `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b infra/actualizar-version-kafka
   ```

2. **Modificar** los archivos de configuración necesarios:
   ```bash
   # Ejemplo: cambiar la versión de Kafka
   # Editar values.yaml o values-prod.yaml
   git add .
   git commit -m "chore(infra): actualizar Kafka a versión 3.8.0"
   ```

3. **Crear Pull Request** hacia `main`:
   - Descripción detallada del cambio de infraestructura.
   - Incluir el impacto esperado.

4. **Revisión y aprobación**:
   - Mínimo 1 aprobación.
   - Pipeline de validación (lint de Helm, `helm template --dry-run`) debe pasar.

5. **Merge a `main`**:
   - Al hacer merge, el pipeline de CD detecta los cambios y aplica automáticamente `helm upgrade --install` en el entorno correspondiente.

---

## Despliegue por Entorno

El pipeline de infraestructura determina qué entorno actualizar según los archivos modificados:

```
Si cambia values-dev.yaml     → desplegar en DEV
Si cambia values-staging.yaml → desplegar en STAGING
Si cambia values-prod.yaml    → desplegar en PROD (con aprobación manual)
Si cambia values.yaml o templates/ → desplegar en todos
```

---

## Diagrama del Flujo GitOps

```
Desarrollador                Repositorio               Cluster K8s
     │                           │                         │
     │  PR: cambio en            │                         │
     │  values-prod.yaml         │                         │
     ├──────────────────────────►│                         │
     │                           │   Merge a main          │
     │                           ├────────┐                │
     │                           │  Pipeline CD detecta    │
     │                           │  cambio en *-prod.yaml  │
     │                           │        │                │
     │                           │  helm upgrade --install │
     │                           │  -f values-prod.yaml    │
     │                           │        ├───────────────►│
     │                           │        │    Deploy OK   │
     │                           │◄───────┘                │
```

---

## Reglas de Protección

- ❌ No se permite `push` directo a `main`.
- ✅ Todo cambio de infraestructura entra vía Pull Request.
- ✅ El pipeline ejecuta `helm lint` y `helm template --dry-run` antes de aprobar.
- ✅ Para cambios en producción (`values-prod.yaml`) se requiere aprobación manual adicional en el pipeline.

---

## Justificación

Se eligió **rama única + carpetas por entorno** sobre **ramas por entorno** porque:
- Evita el "drift" entre ramas (`dev` y `prod` divergen y se pierde la trazabilidad).
- Un solo `main` como fuente de verdad facilita auditorías.
- Los archivos `values-<env>.yaml` hacen explícita la diferencia de configuración entre entornos.
- Compatible con herramientas GitOps como ArgoCD y Flux.
