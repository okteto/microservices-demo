# 7. Implementación de la Infraestructura (20.0%)

## Objetivo

Documentar la infraestructura necesaria para desplegar la aplicación de votación completa en un clúster Kubernetes, describiendo cada componente, su configuración y cómo se interconectan.

---

## Componentes de Infraestructura

### 7.1 PostgreSQL 16

**Propósito:** Almacenar los votos persistentemente.

**Configuración en Helm (`infrastructure/values.yaml`):**

```yaml
postgresql:
  image:
    repository: postgres
    tag: "16"
    pullPolicy: IfNotPresent
  auth:
    username: okteto
    password: okteto
    database: votes
  persistence:
    enabled: true
    size: 1Gi
  service:
    port: 5432
```

**Recursos de Kubernetes generados:**
| Recurso | Nombre | Descripción |
|---------|--------|-------------|
| Deployment | `postgresql` | Pod con la instancia de PostgreSQL |
| Service | `postgresql` | Servicio ClusterIP en puerto 5432 |
| PersistentVolumeClaim | `postgresql-pvc` | Volumen de 1Gi para datos persistentes |

**Esquema de base de datos:**
```sql
-- Creado automáticamente por el Worker al iniciar
CREATE TABLE IF NOT EXISTS votes (
    id   VARCHAR(255) NOT NULL UNIQUE,
    vote VARCHAR(255) NOT NULL
);
```

---

### 7.2 Apache Kafka 3.7.0 (Modo KRaft)

**Propósito:** Broker de mensajería que desacopla la recepción de votos (Vote) de su procesamiento (Worker).

**Configuración en Helm (`infrastructure/values.yaml`):**

```yaml
kafka:
  image:
    repository: apache/kafka
    tag: "3.7.0"
    pullPolicy: IfNotPresent
  persistence:
    enabled: true
    size: 1Gi
  service:
    port: 9092
  config:
    nodeId: 1
    processRoles: "broker,controller"
    controllerQuorumVoters: "1@localhost:9093"
    listeners: "PLAINTEXT://:9092,CONTROLLER://:9093"
    advertisedListeners: "PLAINTEXT://kafka:9092"
    controllerListenerNames: "CONTROLLER"
    listenerSecurityProtocolMap: "CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT"
```

**Nota importante:** Se usa el modo **KRaft** (sin Zookeeper), lo cual simplifica la arquitectura eliminando la dependencia externa de Zookeeper.

**Recursos de Kubernetes generados:**
| Recurso | Nombre | Descripción |
|---------|--------|-------------|
| Deployment | `kafka` | Pod con la instancia de Kafka |
| Service | `kafka` | Servicio ClusterIP en puerto 9092 |
| PersistentVolumeClaim | `kafka-pvc` | Volumen de 1Gi para logs de Kafka |

---

### 7.3 Microservicio Vote (Java / Spring Boot)

**Dockerfile (`vote/Dockerfile`):**
```dockerfile
FROM maven:3-eclipse-temurin-22 as build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:resolve
COPY src ./src
RUN mvn package -DskipTests

FROM eclipse-temurin:22-jre
COPY --from=build /app/target/*.jar /app/app.jar
EXPOSE 8080
CMD ["java", "-jar", "/app/app.jar"]
```

**Despliegue Helm:** `helm upgrade --install vote vote/chart --set image=<REGISTRY>/vote:<TAG>`

---

### 7.4 Microservicio Worker (Go)

**Dockerfile (`worker/Dockerfile`):**
```dockerfile
FROM golang:1.24 as build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o worker .

FROM alpine:latest
COPY --from=build /app/worker /app/worker
CMD ["/app/worker"]
```

**Despliegue Helm:** `helm upgrade --install worker worker/chart --set image=<REGISTRY>/worker:<TAG>`

---

### 7.5 Microservicio Result (Node.js)

**Dockerfile (`result/Dockerfile`):**
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["node", "server.js"]
```

**Despliegue Helm:** `helm upgrade --install result result/chart --set image=<REGISTRY>/result:<TAG>`

---

## Despliegue Completo (Orden de ejecución)

```bash
# 1. Desplegar infraestructura base (PostgreSQL + Kafka)
helm upgrade --install infrastructure infrastructure/

# 2. Esperar a que los pods estén listos
kubectl wait --for=condition=ready pod -l app=postgresql --timeout=120s
kubectl wait --for=condition=ready pod -l app=kafka --timeout=120s

# 3. Desplegar microservicios
helm upgrade --install vote vote/chart --set image=<REGISTRY>/vote:latest
helm upgrade --install worker worker/chart --set image=<REGISTRY>/worker:latest
helm upgrade --install result result/chart --set image=<REGISTRY>/result:latest

# 4. Verificar
kubectl get pods
kubectl get svc
```

---

## Diagrama de Red Interno (Kubernetes)

```
┌─────────────────────────────────────────────────┐
│               Kubernetes Network                 │
│                                                  │
│   vote:8080 ─────► kafka:9092 ◄───── worker     │
│                                        │         │
│                                        ▼         │
│   result:4000 ──────────────► postgresql:5432    │
│                                                  │
└─────────────────────────────────────────────────┘
```

Los servicios se comunican usando sus **nombres DNS internos** de Kubernetes (ej. `kafka:9092`, `postgresql:5432`).

---

## Validación Post-Despliegue

```bash
# Verificar que todos los pods están Running
kubectl get pods -o wide

# Verificar servicios y sus IPs
kubectl get svc

# Verificar logs de cada componente
kubectl logs -l app=vote --tail=20
kubectl logs -l app=worker --tail=20
kubectl logs -l app=result --tail=20

# Verificar conexión a la base de datos
kubectl exec -it $(kubectl get pod -l app=postgresql -o name) -- \
  psql -U okteto -d votes -c "SELECT COUNT(*) FROM votes;"
```
