# 1. Estrategia de Branching para Desarrolladores

## Modelo elegido: GitHub Flow

Se adopta **GitHub Flow** por su simplicidad y compatibilidad con pipelines CI/CD, ideal para un equipo ágil que trabaja con microservicios.


## Ramas Principales

| Rama | Propósito | Protegida |
|------|-----------|-----------|
| `main` | Código estable, listo para producción | Sí |
| `feature/<nombre>` | Desarrollo de nuevas funcionalidades |  No |
| `bugfix/<nombre>` | Corrección de errores detectados |  No |
| `hotfix/<nombre>` | Correcciones urgentes en producción | No |

---

## Convención de Nombres de Ramas

```
feature/vote-cambiar-opciones
feature/result-mejorar-ui
bugfix/worker-conexion-kafka
hotfix/vote-cookie-duplicada
```

Formato: `<tipo>/<microservicio>-<descripcion-corta>`

---

## Flujo de Trabajo

```
main ──────────────────────────────────────────► (producción)
  │                                        ▲
  └── feature/vote-nueva-opcion ──► PR ────┘
       (desarrollo individual)    (revisión)
```

### Paso a paso:

1. **Crear rama** desde `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/vote-nueva-opcion
   ```

2. **Desarrollar** realizando commits pequeños y descriptivos:
   ```bash
   git add .
   git commit -m "feat(vote): agregar tercera opción de votación"
   ```

3. **Subir la rama** al repositorio remoto:
   ```bash
   git push origin feature/vote-nueva-opcion
   ```

4. **Crear Pull Request (PR)** hacia `main`:
   - Título descriptivo.
   - Descripción del cambio.
   - Asignar al menos un revisor.

5. **Revisión de código (Code Review)**:
   - Mínimo 1 aprobación requerida.
   - El pipeline CI debe pasar (build + tests).

6. **Merge a `main`**:
   - Usar **Squash and Merge** para mantener el historial limpio.
   - Eliminar la rama después del merge.

---

## Reglas de Protección de la rama `main`

- ❌ No se permite hacer `push` directo a `main`.
- ✅ Todo cambio entra vía Pull Request.
- ✅ Se requiere al menos 1 aprobación de code review.
- ✅ El pipeline CI debe completarse exitosamente antes de habilitar el merge.
- ✅ La rama feature se elimina automáticamente tras el merge.



## Convención de Commits (Conventional Commits)


feat(vote): agregar opción de voto "Pizza"
fix(worker): corregir conexión intermitente a Kafka
docs(result): actualizar README con instrucciones de ejecución
chore(infra): actualizar versión de Helm chart



## Diagrama del Flujo


        ┌─────────────────────────────────────────────┐
        │                    main                      │
        │  (protegida, solo recibe merges via PR)      │
        └──────┬──────────────────────────▲────────────┘
               │                          │
               │  git checkout -b         │  Squash & Merge
               │  feature/xxx             │  (tras CI verde + review)
               ▼                          │
        ┌─────────────────────────────────┘
        │   feature/vote-nueva-opcion
        │   - commit 1
        │   - commit 2
        │   - Push → Pull Request
        └─────────────────────────────────




## Justificación

GitHub Flow fue elegido sobre Gitflow porque:
- El proyecto despliega a un solo entorno (no requiere ramas `develop`, `release` ni `staging` separadas).
- Es más simple de adoptar y entender.
- Se alinea perfectamente con CI/CD: cada merge a `main` dispara el pipeline de construcción y despliegue automático.



## Identificación e Implementación de Patrones de Diseño

Como parte del flujo de branching, los patrones de diseño se identifican y se implementan en ramas `feature/` dedicadas, pasando por Pull Request antes de integrarse a `main`.

### Patrones Identificados en el Proyecto

| Patrón | Microservicio | Descripción breve |
|--------|--------------|-------------------|
| **Asynchronous Messaging** | Vote → Kafka → Worker | Desacoplamiento mediante broker de mensajes |
| **External Configuration Store** | Vote, Worker, Result | Configuración externalizada en ENV vars y Helm values |
| **Backends for Frontends (BFF)** | Vote Service, Result Service | Un backend dedicado por tipo de cliente |
| **Strategy** | Worker (Go) | Estrategia intercambiable de conexión a servicios externos |
| **Observer** | Vote (Java) | Notificación a múltiples manejadores al recibir un voto |



### Patrones Implementados (con código)

Se eligieron los patrones **Strategy** y **Observer** por ser los más representativos del comportamiento interno de los microservicios y las más sencillos de implementar sin alterar la lógica de negocio existente.

#### Patrón 1: Strategy — Worker (Go)

**Rama:** `feature/worker-strategy-pattern`

**Problema:** El worker tenía la lógica de reintentos de conexión (a Kafka y a PostgreSQL) duplicada en loops infinitos dentro de funciones independientes (`openDatabase`, `getKafkaMaster`). Si se quisiera cambiar la estrategia de retry (ej. exponential backoff), habría que modificar múltiples lugares.

**Solución:** Se define una interfaz `ConnectStrategy` con un método `Connect()`, permitiendo pasar cualquier estrategia de conexión como parámetro.

**Archivos modificados:** `worker/main.go`

```go
// ConnectStrategy define cómo conectar a un servicio externo.
type ConnectStrategy func() error

// retryUntilConnected ejecuta la estrategia hasta que tenga éxito.
func retryUntilConnected(strategy ConnectStrategy, serviceName string) {
    fmt.Printf("Waiting for %s...\n", serviceName)
    for {
        if err := strategy(); err == nil {
            fmt.Printf("%s connected!\n", serviceName)
            return
        }
    }
}
```

**Uso:**
```go
retryUntilConnected(func() error { return db.Ping() }, "postgresql")
retryUntilConnected(func() error { _, err := sarama.NewConsumer(brokers, config); return err }, "kafka")
```

---

#### Patrón 2: Observer — Vote Service (Java)

**Rama:** `feature/vote-observer-pattern`

**Problema:** En `VoteController.java`, cuando llega un voto, el controlador realiza directamente dos acciones acopladas: loggear y enviar a Kafka. Agregar una acción nueva (ej. métricas, auditoría) requeriría modificar el controlador.

**Solución:** Se define una interfaz `VoteEventHandler` (Observer). El controlador notifica a todos los handlers registrados, sin conocer su implementación.

**Archivos modificados/creados:**
- `vote/src/main/java/com/okteto/vote/controller/VoteEventHandler.java` *(nuevo)*
- `vote/src/main/java/com/okteto/vote/controller/VoteController.java` *(modificado)*

```java
// VoteEventHandler.java — interfaz Observer
public interface VoteEventHandler {
    void onVoteReceived(String voterId, String vote);
}
```

```java
// Implementación: maneja el envío a Kafka
public class KafkaVoteHandler implements VoteEventHandler {
    private final KafkaTemplate<String, String> kafkaTemplate;
    private static final String TOPIC = "votes";

    public KafkaVoteHandler(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    @Override
    public void onVoteReceived(String voterId, String vote) {
        kafkaTemplate.send(TOPIC, voterId, vote);
    }
}
```

```java
// En VoteController: registro y notificación
List<VoteEventHandler> handlers = List.of(
    new KafkaVoteHandler(kafkaTemplate),
    new LogVoteHandler(logger)
);

// Al recibir un voto:
handlers.forEach(h -> h.onVoteReceived(voter, vote));
```


### Flujo de Ramas para Implementación de Patrones

main
  │
  ├── feature/worker-strategy-pattern   ← Patrón Strategy en Go
  │       └── PR → Code Review → Merge
  │
  └── feature/vote-observer-pattern     ← Patrón Observer en Java
          └── PR → Code Review → Merge


Cada rama sigue el flujo estándar de GitHub Flow: se crea desde `main`, se desarrolla, se abre un Pull Request y pasa por revisión antes de integrarse.
