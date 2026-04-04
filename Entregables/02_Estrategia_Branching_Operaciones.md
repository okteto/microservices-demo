# 2. Estrategia de Branching para Operaciones

## Enfoque: Infraestructura como Código (IaC)

En este proyecto, la infraestructura (configuración de contenedores y servicios) se trata igual que el código de la aplicación. Toda la definición de cómo debe funcionar el sistema en la nube está guardada en archivos YAML dentro del repositorio.

---

## Modelo de Branching: Rama Única con Despliegue Automatizado

Se utiliza una estrategia de **rama principal (`main`)** protegida, donde cualquier cambio en la configuración de los servidores debe ser revisado antes de aplicarse.

### Ramas y Proceso de Cambio

| Rama | Propósito | Prefijo |
|------|-----------|---------|
| `main` | Configuración activa en el clúster Kubernetes. | - |
| `infra/` | Rama temporal para cambios de configuración. | `infra/` |

**Ejemplo de flujo:**
1. Si necesitamos aumentar las réplicas de un servicio o cambiar una variable de entorno de la base de datos, creamos la rama `infra/ajuste-recursos`.
2. Modificamos el archivo `okteto.yml` o los manifiestos de Kubernetes en la carpeta `infrastructure/`.
3. Abrimos un **Pull Request** para que el equipo de operaciones valide que el cambio no romperá el clúster.

---

## Integración con GitHub Actions (CI/CD)

La estrategia de branching de operaciones está directamente ligada a **GitHub Actions**:

1. **Trigger:** El pipeline de despliegue (CD) se activa automáticamente cuando detecta un `push` o `merge` exitoso en la rama `main`.
2. **Construcción (Docker):** El pipeline construye las imágenes de Docker basadas en los Dockerfiles de cada microservicio.
3. **Despliegue (Kubernetes):** GitHub Actions usa comandos de `kubectl` para aplicar los cambios en el clúster. 
   - *Comando clave:* `kubectl apply -f infrastructure/` o `okteto deploy`.

---

## Control de Calidad en Operaciones

Para asegurar la estabilidad, se aplican estas reglas en el flujo de branching:

- **Validación de YAML:** Antes de aprobar el Pull Request, GitHub Actions verifica que los archivos de configuración no tengan errores de sintaxis (Linter).
- **Entornos de Prueba:** Los cambios se prueban primero en la rama de `feature` (usando un namespace temporal) antes de integrarse a la rama `main` definitiva.
- **Rollback (Reversión):** Si un cambio en `main` causa fallos, se utiliza Git para hacer un `revert` del commit, lo que activa automáticamente el pipeline para volver a la configuración estable anterior.

---

## Justificación

Se eligió este modelo simplificado porque:
1. **Visibilidad:** Todo el equipo sabe exactamente qué cambios se hicieron en los servidores mirando el historial de Git.
2. **Automatización:** Evita errores humanos al configurar los servicios manualmente.
3. **Seguridad:** Nadie puede cambiar la configuración de producción sin que el cambio pase por una revisión de código.
