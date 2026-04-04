# 9. Entrega de Resultados - Documentación General (10.0%)

## Descripción del Proyecto

**Microservices Demo** es una aplicación de votación distribuida que demuestra el uso de arquitecturas basadas en microservicios, mensajería asíncrona y despliegue en la nube con Kubernetes.

---

## Índice de Entregables

| # | Punto del Taller | Documento | Peso |
|---|-------------------|-----------|------|
| 1 | Estrategia de branching (desarrolladores) | [01_Estrategia_Branching_Desarrolladores.md](./01_Estrategia_Branching_Desarrolladores.md) | 2.5% |
| 2 | Estrategia de branching (operaciones) | [02_Estrategia_Branching_Operaciones.md](./02_Estrategia_Branching_Operaciones.md) | 2.5% |
| 3 | Patrones de diseño de nube | [03_Patrones_Diseno_Nube.md](./03_Patrones_Diseno_Nube.md) | 15.0% |
| 4 | Diagrama de arquitectura | [04_Diagrama_Arquitectura.md](./04_Diagrama_Arquitectura.md) | 15.0% |
| 5 | Pipelines de desarrollo (CI) | [05_Pipelines_Desarrollo.md](./05_Pipelines_Desarrollo.md) | 15.0% |
| 6 | Pipelines de infraestructura (CD) | [06_Pipelines_Infraestructura.md](./06_Pipelines_Infraestructura.md) | 5.0% |
| 7 | Implementación de la infraestructura | [07_Implementacion_Infraestructura.md](./07_Implementacion_Infraestructura.md) | 20.0% |
| 8 | Demostración en vivo | [08_Demostracion_En_Vivo.md](./08_Demostracion_En_Vivo.md) | 15.0% |
| 9 | Entrega de resultados (este documento) | [09_Entrega_Resultados.md](./09_Entrega_Resultados.md) | 10.0% |

---

## Stack Tecnológico

| Componente | Tecnología | Versión |
|------------|-----------|---------|
| Frontend de votación | Java, Spring Boot, Thymeleaf | Java 22, Spring 3.4.1 |
| Worker (procesamiento) | Go, Sarama (Kafka client) | Go 1.24.1 |
| Panel de resultados | Node.js, Express, Socket.io | Node 20, Express 4.21 |
| Base de datos | PostgreSQL | 16 |
| Broker de mensajes | Apache Kafka (KRaft) | 3.7.0 |
| Orquestación | Kubernetes + Helm | Helm 3 |
| CI/CD | GitHub Actions | — |
| Desarrollo en la nube | Okteto | — |

---

## Repositorio

- **URL:** `https://github.com/<usuario>/microservices-demo`
- **Rama principal:** `main`
- **Estrategia de branching:** GitHub Flow (desarrollo) + GitOps con carpetas por entorno (operaciones)

---

## Estructura del Repositorio

```
microservices-demo/
├── .github/
│   └── workflows/
│       ├── ci-vote.yml          # Pipeline CI para Vote
│       ├── ci-result.yml        # Pipeline CI para Result
│       ├── ci-worker.yml        # Pipeline CI para Worker
│       └── cd-deploy.yml        # Pipeline CD para despliegue
├── Entregables/                 # Documentación del taller (9 puntos)
│   ├── 01_Estrategia_Branching_Desarrolladores.md
│   ├── 02_Estrategia_Branching_Operaciones.md
│   ├── 03_Patrones_Diseno_Nube.md
│   ├── 04_Diagrama_Arquitectura.md
│   ├── 05_Pipelines_Desarrollo.md
│   ├── 06_Pipelines_Infraestructura.md
│   ├── 07_Implementacion_Infraestructura.md
│   ├── 08_Demostracion_En_Vivo.md
│   └── 09_Entrega_Resultados.md
├── infrastructure/              # Helm chart de PostgreSQL y Kafka
├── vote/                        # Microservicio de votación (Java)
├── result/                      # Microservicio de resultados (Node.js)
├── worker/                      # Microservicio procesador (Go)
├── okteto.yml                   # Manifiesto de Okteto
└── README.md
```

---

## Patrones de Diseño de Nube Implementados

1. **Mensajería Asíncrona** — Desacoplamiento via Kafka entre Vote y Worker.
2. **External Configuration Store** — Configuración externalizada en Helm values y variables de entorno.
3. **Backends for Frontends** — Backends separados e independientes para votación y resultados.

---

## Pipelines Implementados

### CI (Integración Continua)
- 3 pipelines independientes, uno por microservicio.
- Se disparan solo cuando cambian archivos en su carpeta respectiva.
- Ejecutan: build → test → Docker build & push.

### CD (Despliegue Continuo)
- 1 pipeline que se activa al finalizar cualquier CI exitoso o al modificar charts de Helm.
- Ejecuta: `helm upgrade --install` para cada componente.

---

## Cómo Ejecutar Localmente (con Okteto)

```bash
git clone https://github.com/<usuario>/microservices-demo
cd microservices-demo
okteto login
okteto deploy
```

---

## Integrantes

| Nombre | Rol |
|--------|-----|
| [Nombre 1] | Desarrollo + Documentación |
| [Nombre 2] | Infraestructura + Pipelines |

---

## Referencias

- [Okteto Documentation](https://www.okteto.com/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Azure Architecture Patterns](https://learn.microsoft.com/en-us/azure/architecture/patterns/)
- [Apache Kafka KRaft](https://kafka.apache.org/documentation/#kraft)
