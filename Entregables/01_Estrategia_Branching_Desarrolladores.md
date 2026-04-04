# 1. Estrategia de Branching para Desarrolladores

## Modelo elegido: GitHub Flow (Ciclo de Vida Ágil)

Se adopta **GitHub Flow** para maximizar la velocidad de integración y despliegue continuo (CI/CD), permitiendo que cada microservicio evolucione de forma independiente pero manteniendo la estabilidad de `main`.

---

## Ramas y Nomenclatura del Proyecto

| Rama | Propósito | Prefijo | Protegida |
|------|-----------|---------|-----------|
| `main` | Rama productiva, código estable y desplegable. | - |  Sí |
| **Funcionalidad** | Nuevas características o patrones. | `feature/` |  No |
| **Refactorización**| Mejoras de arquitectura sin cambio lógico. | `refactor/` |  No |
| **Corrección** | Arreglo de bugs detectados en dev. | `bugfix/` |  No |
| **Urgente** | Arreglo de bugs en producción. | `hotfix/` |  No |

### Ejemplo Real de Nombres (Casos de Patrones)
- `feature/worker-strategy-pattern`
- `feature/vote-observer-pattern`
- `refactor/result-ui-cleanup`

---

## Ciclo de Vida de una Rama de Patrón (Workflow)

Para la implementación de patrones de diseño (Punto 3 del Taller), seguimos este flujo estricto para asegurar la calidad técnica:

### 1. Creación y Aislamiento
Toda implementación de un patrón (ej. *Strategy*) nace de un `main` actualizado. Esto garantiza que el patrón no herede deudas técnicas de ramas en progreso.

### 2. Desarrollo Atómico (Commits)
Se promueve el uso de **Conventional Commits** para trazar el progreso del patrón:
- `feat(worker): define connection strategy interface`
- `feat(worker): implement postgresql retry strategy`

### 3. Pull Request (PR) y "Definition of Done"
Para que un patrón sea fusionado en `main`, debe cumplir con:
1. **Documentación:** El código debe incluir comentarios (JavaDoc/GoDoc) explicando la intención del patrón.
2. **Revisión de Pares (Code Review):** Al menos una aprobación externa.
3. **Pipeline CI "Verde":** Ejecución exitosa de `mvn test` (Java) o `go test` (Go).
4. **Validación de Arquitectura:** Confirmar que no introduce acoplamientos innecesarios.

### 4. Squash & Merge
Fusionamos los commits de la rama `feature` en uno solo descriptivo para mantener un historial de `main` limpio y legible:
`Merged PR #4: Implementación de Patrón Strategy en Worker Service`

---

## Manejo de Versiones y Hitos (Git Tags)

Para marcar momentos importantes (como la entrega de este Taller), usamos etiquetas semánticas (`SemVer`):

- **v1.0.0-taller:** Versión base de la aplicación.
- **v1.1.0-patrones:** Versión con patrones de diseño (Strategy y Observer) integrados.

**Comando:**
```bash
git tag -a v1.1.0-patrones -m "Entrega Punto 3: Patrones de Diseño"
git push origin v1.1.0-patrones
```

---

## Patrones Identificados en el Proyecto

| Patrón | Microservicio | Descripción breve |
|--------|--------------|-------------------|
| **Asynchronous Messaging** | Vote → Kafka → Worker | Desacoplamiento mediante broker de mensajes |
| **External Configuration Store** | Vote, Worker, Result | Configuración externalizada en ENV vars y Helm values |
| **Backends for Frontends (BFF)** | Vote Service, Result Service | Un backend dedicado por tipo de cliente |
| **Strategy** | Worker (Go) | Estrategia intercambiable de conexión a servicios externos |
| **Observer** | Vote (Java) | Notificación a múltiples manejadores al recibir un voto |

---

## Patrones Implementados (Código de Referencia)

Se eligieron los patrones **Strategy** y **Observer** por ser los más representativos del comportamiento interno de los microservicios.

#### Patrón 1: Strategy — Worker (Go)
**Rama:** `feature/worker-strategy-pattern`
**Uso:** Se define una interfaz `ConnectStrategy` para manejar reintentos de conexión a bases de datos y Kafka de forma genérica.

#### Patrón 2: Observer — Vote Service (Java)
**Rama:** `feature/vote-observer-pattern`
**Uso:** Se desacopla la recepción del voto de sus efectos secundarios (logging, Kafka) mediante una interfaz `VoteEventHandler`.

---

## Justificación Técnica de la Elección

GitHub Flow es el estándar para microservicios porque:
1. **Evita el "Merge Hell":** Al tener ramas de vida corta, los conflictos son mínimos.
2. **Promueve CI/CD:** Fomenta la idea de que `main` es siempre desplegable.
3. **Desacoplamiento:** Permite que un desarrollador trabaje en el patrón del `worker` sin interferir con el `vote` service.
4. **Trazabilidad:** Mediante los Pull Requests, queda un registro histórico del "por qué" se tomó cada decisión de diseño.
