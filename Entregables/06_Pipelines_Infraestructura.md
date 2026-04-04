# 6. Pipelines de Infraestructura (5.0%)

## Objetivo

Implementar un pipeline de **Continuous Deployment (CD)** que despliegue automáticamente los cambios de infraestructura y las nuevas versiones de los microservicios en el clúster Kubernetes.

---

## Estrategia

El pipeline de infraestructura se activa cuando:
1. Un pipeline de CI (Punto 5) publica una nueva imagen Docker → El CD la despliega en el clúster.
2. Se modifican los archivos de configuración de Helm (`infrastructure/`, `*/chart/`) → El CD aplica los cambios.

---

## Script: Pipeline CD

**Archivo:** `.github/workflows/cd-deploy.yml`

```yaml
name: CD - Deploy to Kubernetes

on:
  # Se dispara cuando algún pipeline CI termina exitosamente
  workflow_run:
    workflows:
      - "CI - Vote Service"
      - "CI - Result Service"
      - "CI - Worker Service"
    types:
      - completed
    branches: [main]

  # También se dispara si cambian archivos de infraestructura
  push:
    branches: [main]
    paths:
      - 'infrastructure/**'
      - 'vote/chart/**'
      - 'result/chart/**'
      - 'worker/chart/**'
      - 'okteto.yml'

jobs:
  deploy:
    name: Deploy to Cluster
    runs-on: ubuntu-latest
    # Solo despliega si el workflow CI fue exitoso (o si es push directo)
    if: >
      github.event_name == 'push' ||
      github.event.workflow_run.conclusion == 'success'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure kubectl
        uses: azure/setup-kubectl@v4

      - name: Set Kubernetes context
        uses: azure/k8s-set-context@v4
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG }}

      - name: Install Helm
        uses: azure/setup-helm@v4
        with:
          version: 'v3.14.0'

      - name: Deploy infrastructure (PostgreSQL + Kafka)
        run: |
          helm upgrade --install infrastructure infrastructure/ \
            --wait --timeout 300s

      - name: Deploy Vote service
        run: |
          helm upgrade --install vote vote/chart \
            --set image=${{ secrets.DOCKER_USERNAME }}/vote:${{ github.sha }} \
            --wait --timeout 120s

      - name: Deploy Result service
        run: |
          helm upgrade --install result result/chart \
            --set image=${{ secrets.DOCKER_USERNAME }}/result:${{ github.sha }} \
            --wait --timeout 120s

      - name: Deploy Worker service
        run: |
          helm upgrade --install worker worker/chart \
            --set image=${{ secrets.DOCKER_USERNAME }}/worker:${{ github.sha }} \
            --wait --timeout 120s

      - name: Verify deployment
        run: |
          echo "=== Pods status ==="
          kubectl get pods
          echo "=== Services ==="
          kubectl get svc
```

---

## Secretos Requeridos Adicionales

| Secreto | Descripción |
|---------|-------------|
| `KUBE_CONFIG` | Contenido del archivo `kubeconfig` codificado en base64 para acceder al clúster |

**Cómo obtenerlo:**
```bash
# En tu máquina local (con acceso al clúster):
cat ~/.kube/config | base64
# Copiar el resultado y pegarlo como secreto KUBE_CONFIG en GitHub
```

---

## Flujo Completo CI → CD

```
┌───────────────┐     ┌───────────────┐     ┌───────────────────────┐
│  Desarrollador│     │  GitHub       │     │  Kubernetes Cluster   │
│               │     │  Actions      │     │                       │
│  git push     │────►│               │     │                       │
│  (main)       │     │  CI Pipeline  │     │                       │
│               │     │  - Build      │     │                       │
│               │     │  - Test       │     │                       │
│               │     │  - Push image │     │                       │
│               │     │       │       │     │                       │
│               │     │       ▼       │     │                       │
│               │     │  CD Pipeline  │     │                       │
│               │     │  (triggered)  │     │                       │
│               │     │  - helm       │────►│  Pod actualizado      │
│               │     │    upgrade    │     │  con nueva imagen     │
│               │     │  - kubectl    │     │                       │
│               │     │    verify     │     │                       │
└───────────────┘     └───────────────┘     └───────────────────────┘
```

---

## Diferencia entre Pipeline CI (Punto 5) y CD (Punto 6)

| Aspecto | CI (Desarrollo) | CD (Infraestructura) |
|---------|-----------------|---------------------|
| **Cuándo** | Al modificar código de un microservicio | Al terminar CI o al modificar charts/infra |
| **Qué hace** | Compila, prueba, construye y sube imagen Docker | Despliega la nueva imagen en Kubernetes |
| **Artefacto** | Imagen Docker en el registry | Pods actualizados en el clúster |
| **Herramientas** | Maven, npm, Go, Docker | Helm, kubectl |
