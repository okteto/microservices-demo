# 5. Pipelines de Desarrollo (15.0%)

## Objetivo

Implementar pipelines de **Integración Continua (CI)** para los tres microservicios (`vote`, `worker`, `result`), de modo que cada merge a `main` construya y publique automáticamente las imágenes Docker.

---

## Plataforma elegida: GitHub Actions

Se utiliza **GitHub Actions** por su integración nativa con GitHub y su capa gratuita suficiente para proyectos académicos.

---

## Pipeline CI General (aplica a los 3 microservicios)

### Trigger (Disparador)

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'vote/**'      # Solo se ejecuta si cambia el microservicio correspondiente
  pull_request:
    branches: [main]
    paths:
      - 'vote/**'
```

### Etapas del Pipeline

```
┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌──────────────┐
│ Checkout │───►│  Build   │───►│  Test (si    │───►│ Docker Build │
│          │    │          │    │  aplica)     │    │ & Push       │
└──────────┘    └──────────┘    └──────────────┘    └──────────────┘
```

---

## Script: Pipeline CI para `vote` (Java/Spring Boot)

**Archivo:** `.github/workflows/ci-vote.yml`

```yaml
name: CI - Vote Service

on:
  push:
    branches: [main]
    paths:
      - 'vote/**'
  pull_request:
    branches: [main]
    paths:
      - 'vote/**'

jobs:
  build-and-push:
    name: Build & Push Vote Image
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up JDK 22
        uses: actions/setup-java@v4
        with:
          java-version: '22'
          distribution: 'temurin'

      - name: Cache Maven packages
        uses: actions/cache@v4
        with:
          path: ~/.m2
          key: ${{ runner.os }}-m2-${{ hashFiles('vote/pom.xml') }}

      - name: Build with Maven
        working-directory: vote
        run: mvn clean package -DskipTests

      - name: Run tests
        working-directory: vote
        run: mvn test

      - name: Login to Docker Hub
        if: github.event_name == 'push'
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push Docker image
        if: github.event_name == 'push'
        uses: docker/build-push-action@v5
        with:
          context: vote
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/vote:latest
            ${{ secrets.DOCKER_USERNAME }}/vote:${{ github.sha }}
```

---

## Script: Pipeline CI para `result` (Node.js)

**Archivo:** `.github/workflows/ci-result.yml`

```yaml
name: CI - Result Service

on:
  push:
    branches: [main]
    paths:
      - 'result/**'
  pull_request:
    branches: [main]
    paths:
      - 'result/**'

jobs:
  build-and-push:
    name: Build & Push Result Image
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: result
        run: npm ci

      - name: Login to Docker Hub
        if: github.event_name == 'push'
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push Docker image
        if: github.event_name == 'push'
        uses: docker/build-push-action@v5
        with:
          context: result
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/result:latest
            ${{ secrets.DOCKER_USERNAME }}/result:${{ github.sha }}
```

---

## Script: Pipeline CI para `worker` (Go)

**Archivo:** `.github/workflows/ci-worker.yml`

```yaml
name: CI - Worker Service

on:
  push:
    branches: [main]
    paths:
      - 'worker/**'
  pull_request:
    branches: [main]
    paths:
      - 'worker/**'

jobs:
  build-and-push:
    name: Build & Push Worker Image
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.24'

      - name: Build
        working-directory: worker
        run: go build -v ./...

      - name: Run tests
        working-directory: worker
        run: go test -v ./...

      - name: Login to Docker Hub
        if: github.event_name == 'push'
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push Docker image
        if: github.event_name == 'push'
        uses: docker/build-push-action@v5
        with:
          context: worker
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/worker:latest
            ${{ secrets.DOCKER_USERNAME }}/worker:${{ github.sha }}
```

---

## Secretos Requeridos en GitHub

Para que los pipelines funcionen, se deben configurar los siguientes **Repository Secrets** en GitHub:

| Secreto | Descripción |
|---------|-------------|
| `DOCKER_USERNAME` | Usuario de Docker Hub |
| `DOCKER_PASSWORD` | Token de acceso de Docker Hub |

**Configuración:** Repositorio → Settings → Secrets and variables → Actions → New repository secret

---

## Resumen de Pipelines CI

| Microservicio | Archivo Workflow | Trigger | Acciones |
|---------------|-----------------|---------|----------|
| Vote | `.github/workflows/ci-vote.yml` | Cambios en `vote/` | Maven build → Tests → Docker push |
| Result | `.github/workflows/ci-result.yml` | Cambios en `result/` | npm install → Docker push |
| Worker | `.github/workflows/ci-worker.yml` | Cambios en `worker/` | Go build → Tests → Docker push |

Cada pipeline solo se ejecuta cuando cambian archivos de su microservicio correspondiente, evitando builds innecesarios.
