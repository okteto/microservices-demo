# 3. Patrones de Diseño de Nube (15.0%)

## Patrones Identificados y Aplicados

Se documentan **tres** patrones de diseño de nube aplicados en el proyecto, superando el mínimo requerido de dos.

---

## Patrón 1: Asynchronous Messaging (Mensajería Asíncrona)

### Descripción
El patrón de **Mensajería Asíncrona** desacopla los componentes de un sistema al conectarlos a través de una cola o broker de mensajes, en lugar de llamadas directas síncronas (HTTP/RPC).

### Aplicación en el Proyecto

- **Productor**: El microservicio `vote` (Java/Spring Boot) envía un mensaje al tópico `votes` de Kafka cada vez que un usuario emite un voto.
  ```java
  // VoteController.java - línea 76
  kafkaTemplate.send(KAFKA_TOPIC, voter, vote);
  ```

- **Broker**: Apache Kafka actúa como intermediario, almacenando temporalmente los mensajes en el tópico `votes`.

- **Consumidor**: El microservicio `worker` (Go) consume los mensajes del tópico y los persiste en PostgreSQL.
  ```go
  // main.go - línea 64
  case msg := <-consumer.Messages():
      // Inserta el voto en la base de datos
  ```

### Beneficios Obtenidos

| Beneficio | Detalle |
|-----------|---------|
| **Desacoplamiento** | `vote` no necesita conocer la existencia de `worker` ni de la base de datos. |
| **Resiliencia** | Si `worker` cae, los mensajes se almacenan en Kafka y se procesan cuando vuelva. |
| **Absorción de picos** | Miles de votos simultáneos se encolan sin saturar PostgreSQL. |
| **Escalabilidad** | Se pueden agregar múltiples instancias de `worker` (consumidores) sin modificar `vote`. |

### Referencia
- [Microsoft - Asynchronous Messaging Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/async-request-reply)

---

## Patrón 2: External Configuration Store (Almacén de Configuración Externo)

### Descripción
Consiste en **externalizar la configuración** de las aplicaciones fuera del código fuente, centralizándola en un almacén accesible en tiempo de despliegue o ejecución. Esto permite cambiar el comportamiento sin recompilar.

### Aplicación en el Proyecto

La configuración de los microservicios se externaliza en múltiples niveles:

**Nivel 1 - Variables de entorno (Runtime)**:
```java
// VoteController.java - líneas 100, 109
String result = System.getenv("OPTION_A"); // "Burritos" por defecto
String result = System.getenv("OPTION_B"); // "Tacos" por defecto
```
Las opciones de votación se pueden cambiar sin tocar código, simplemente definiendo variables de entorno en el contenedor.

**Nivel 2 - Helm Values (Despliegue)**:
```yaml
# infrastructure/values.yaml
postgresql:
  auth:
    username: okteto
    password: okteto
    database: votes
kafka:
  config:
    nodeId: 1
    processRoles: "broker,controller"
```
Toda la configuración de infraestructura (credenciales, puertos, versiones) está centralizada en `values.yaml`, inyectada al momento de desplegar con Helm.

**Nivel 3 - Okteto Manifest (Desarrollo)**:
```yaml
# okteto.yml
dev:
  vote:
    command: mvn spring-boot:run
    sync:
      - ./vote:/app
```

### Beneficios Obtenidos

| Beneficio | Detalle |
|-----------|---------|
| **Sin recompilación** | Cambiar las opciones de voto no requiere rebuild de la imagen Docker. |
| **Separación de concerns** | El código no contiene credenciales hardcodeadas de producción. |
| **Multi-entorno** | Usando `values-dev.yaml` vs `values-prod.yaml` se despliega con diferentes configuraciones. |
| **Seguridad** | Los secretos se gestionan fuera del repositorio de código fuente. |

### Referencia
- [Microsoft - External Configuration Store Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/external-configuration-store)

---

## Patrón 3: Backends for Frontends (BFF)

### Descripción
El patrón **Backends for Frontends** separa los servicios backend según el tipo de frontend que los consume, evitando un único API monolítico que sirva a todos los clientes.

### Aplicación en el Proyecto

- **Vote Service** (Java): Backend exclusivo para la interfaz de votación. Maneja formularios POST y cookies.
- **Result Service** (Node.js): Backend exclusivo para la interfaz de resultados. Maneja WebSockets para actualizaciones en tiempo real.

Cada frontend tiene su propio backend optimizado para su caso de uso, en lugar de compartir un único API.

---

## Patrones de Diseño Implementados (Código Real)

Además de los patrones de arquitectura de nube, se implementaron dos patrones clásicos de diseño de software para mejorar la mantenibilidad de los microservicios.

### Patrón 4: Strategy (Estrategia) — Microservicio Worker (Go)

**Uso:** Manejo de reintentos de conexión a servicios externos (PostgreSQL y Kafka).

- **Problemática:** La lógica de reintentos de conexión estaba duplicada en loops infinitos dentro de funciones separadas. Si se quería cambiar el algoritmo de reintentos (ej. exponencial backoff), había que modificar múltiples archivos.
- **Solución:** Se extrajo la lógica a una función genérica `retryUntilConnected` que acepta una **estrategia de conexión** como parámetro.
- **Archivo de referencia:** `worker/main.go`

```go
// Definición de la estrategia
type ConnectStrategy func() error

// Ejecución de la estrategia en el worker
retryUntilConnected(func() error { return db.Ping() }, "postgresql")
```

---

### Patrón 5: Observer (Observador) — Microservicio Vote (Java)

**Uso:** Desacoplamiento del flujo de procesamiento de votos.

- **Problemática:** El controlador de votos hacía demasiadas cosas: validar el voto, loggearlo y enviarlo al broker de Kafka. Agregar nuevas funciones (como auditoría o métricas) requería modificar el controlador.
- **Solución:** Se implementó una interfaz `VoteEventHandler` (Observer). El controlador ahora solo notifica a los "observadores" registrados cuando llega un voto.
- **Archivo de referencia:** `VoteController.java`, `VoteEventHandler.java`.

```java
// Notificación a múltiples observadores (Kafka, Log)
getHandlers().forEach(handler -> handler.onVoteReceived(finalVoter, finalVote));
```

---

## Resumen Final de Patrones

| Patrón | Tipo | Objetivo |
|--------|------|----------|
| **Asynchronous Messaging** | Arquitectura | Desacoplamiento Vote → Worker |
| **External Configuration Store** | Arquitectura | Gestión de variables (YAML/Env) |
| **Backends for Frontends** | Arquitectura | Backend optimizado por cliente web |
| **Strategy** | Diseño Software | Flexibilidad en reintentos de conexión |
| **Observer** | Diseño Software | Desacoplamiento lógica de negocio |

### Beneficios Obtenidos

| Beneficio | Detalle |
|-----------|---------|
| **Independencia** | El equipo de votación puede evolucionar su backend sin afectar resultados y viceversa. |
| **Optimización** | Cada backend usa la tecnología más adecuada (Java para procesamiento, Node.js para WebSockets). |
| **Despliegue independiente** | Se puede actualizar `vote` sin redesplegar `result`. |
| **Escalabilidad selectiva** | Si votación recibe mucho tráfico, solo se escala `vote`, no todo el sistema. |

### Referencia
- [Microsoft - Backends for Frontends Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends)

---

## Resumen Comparativo

| Patrón | Componentes Involucrados | Problema que Resuelve |
|--------|-------------------------|----------------------|
| Mensajería Asíncrona | Vote → Kafka → Worker | Desacoplamiento y resiliencia ante picos |
| Configuración Externa | Helm values + ENV vars | Flexibilidad sin recompilación |
| Backends for Frontends | Vote Service + Result Service | Independencia y optimización por cliente |
