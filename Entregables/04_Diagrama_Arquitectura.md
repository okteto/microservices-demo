# 4. Diagrama de Arquitectura (15.0%)

## Visión General

El proyecto **microservices-demo** implementa una aplicación de votación distribuida con 5 componentes desplegados en un clúster de Kubernetes, orquestados mediante Helm y gestionados con Okteto.

---

## Diagrama de Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Kubernetes Cluster (Okteto Cloud)                    │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         Namespace: okteto                            │   │
│  │                                                                      │   │
│  │   ┌─────────────┐        ┌─────────────┐       ┌────────────────┐   │   │
│  │   │  Vote Pod    │        │  Kafka Pod  │       │  Worker Pod    │   │   │
│  │   │             │        │             │       │                │   │   │
│  │   │ Java 22     │ Produce│ Apache Kafka│Consume│ Go 1.24        │   │   │
│  │   │ Spring Boot │───────►│ 3.7.0       │──────►│ Sarama Client  │   │   │
│  │   │ Port: 8080  │ topic: │ KRaft mode  │ topic:│                │   │   │
│  │   │             │ "votes"│ Port: 9092  │"votes"│                │   │   │
│  │   └──────┬──────┘        └─────────────┘       └───────┬────────┘   │   │
│  │          │                                             │            │   │
│  │          │ Sirve UI votación                           │ INSERT/    │   │
│  │          │ (Thymeleaf)                                 │ UPDATE     │   │
│  │          │                                             ▼            │   │
│  │          │                                     ┌────────────────┐   │   │
│  │          │                                     │ PostgreSQL Pod │   │   │
│  │          │                                     │                │   │   │
│  │          │                                     │ PostgreSQL 16  │   │   │
│  │          │                                     │ DB: votes      │   │   │
│  │          │                                     │ Port: 5432     │   │   │
│  │          │                                     │   ┌──────────┐ │   │   │
│  │          │                                     │   │ PVC 1Gi  │ │   │   │
│  │          │                                     │   └──────────┘ │   │   │
│  │          │                                     └───────┬────────┘   │   │
│  │          │                                             │            │   │
│  │          │                                    SELECT   │            │   │
│  │          │                                    (polling)│            │   │
│  │          │                                             │            │   │
│  │          │                                     ┌───────┴────────┐   │   │
│  │          │                                     │  Result Pod    │   │   │
│  │          │                                     │                │   │   │
│  │          │                                     │ Node.js        │   │   │
│  │          │                                     │ Express        │   │   │
│  │          │                                     │ Socket.io      │   │   │
│  │          │                                     │ Port: 4000     │   │   │
│  │          │                                     └───────┬────────┘   │   │
│  │          │                                             │            │   │
│  └──────────┼─────────────────────────────────────────────┼────────────┘   │
│             │                                             │                │
│  ┌──────────┴──────────────┐           ┌──────────────────┴──────────┐     │
│  │  Kubernetes Service     │           │  Kubernetes Service         │     │
│  │  vote (LoadBalancer)    │           │  result (LoadBalancer)      │     │
│  │  External Port: 8080   │           │  External Port: 4000       │     │
│  └──────────┬──────────────┘           └──────────────────┬──────────┘     │
└─────────────┼────────────────────────────────────────────┼─────────────────┘
              │                                            │
              ▼                                            ▼
      ┌───────────────┐                           ┌───────────────┐
      │   Usuario     │                           │  Espectador   │
      │   (Votante)   │                           │  (Resultados) │
      │   Navegador   │                           │  Navegador    │
      │   HTTP POST   │                           │  WebSocket    │
      └───────────────┘                           └───────────────┘
```

---

## Flujo de Datos Detallado

```
1. Usuario accede a Vote (HTTP GET /)
   → Se genera cookie voter_id (UUID)
   → Se renderiza formulario HTML (Thymeleaf)

2. Usuario vota (HTTP POST /)
   → VoteController lee cookie voter_id
   → Envía mensaje a Kafka: key=voter_id, value="a" o "b"

3. Worker consume mensajes de Kafka
   → Lee del tópico "votes" (partición 0, offset más antiguo)
   → Ejecuta: INSERT INTO votes (id, vote) VALUES ($1, $2)
              ON CONFLICT(id) DO UPDATE SET vote = $2

4. Result hace polling a PostgreSQL cada 1 segundo
   → SELECT vote, COUNT(id) AS count FROM votes GROUP BY vote
   → Emite resultados vía Socket.io a todos los clientes conectados

5. Navegador del espectador recibe evento "scores"
   → Actualiza gráfico de barras en tiempo real
```

---

## Esquema de la Base de Datos

```sql
CREATE TABLE IF NOT EXISTS votes (
    id   VARCHAR(255) NOT NULL UNIQUE,  -- voter_id (UUID del cliente)
    vote VARCHAR(255) NOT NULL          -- "a" o "b" (opción elegida)
);
```

---

## Componentes de Infraestructura (Helm Charts)

| Componente | Chart | Imagen | Puerto | Persistencia |
|------------|-------|--------|--------|-------------|
| PostgreSQL | `infrastructure/` | `postgres:16` | 5432 | PVC 1Gi |
| Kafka | `infrastructure/` | `apache/kafka:3.7.0` | 9092 | PVC 1Gi |
| Vote | `vote/chart/` | Custom (Dockerfile) | 8080 | No |
| Result | `result/chart/` | Custom (Dockerfile) | 4000 | No |
| Worker | `worker/chart/` | Custom (Dockerfile) | — | No |

---

## Puertos Expuestos en Desarrollo (Okteto)

| Puerto Local | Servicio | Uso |
|-------------|----------|-----|
| 5005 | Vote (Java) | Debugger remoto JDWP |
| 2345 | Worker (Go) | Debugger remoto Delve |
| 5432 | PostgreSQL | Acceso directo a BD |
