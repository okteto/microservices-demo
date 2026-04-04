# 8. Demostración en Vivo de Cambios en el Pipeline (15.0%)

## Objetivo

Demostrar en vivo que un cambio en el código fuente desencadena automáticamente los pipelines CI/CD y actualiza la aplicación desplegada sin intervención manual en el servidor.

---

## Guion de la Demostración

### Pre-requisitos (antes de la presentación)

- [ ] La aplicación está desplegada y funcionando en el clúster.
- [ ] Los pipelines CI (Punto 5) y CD (Punto 6) están configurados y funcionales.
- [ ] Tener abierto en el navegador:
  - Tab 1: Aplicación de votación (Vote) → `http://<URL_VOTE>`
  - Tab 2: Panel de resultados (Result) → `http://<URL_RESULT>`
  - Tab 3: GitHub → Pestaña "Actions" del repositorio
- [ ] Terminal lista con el repositorio clonado.

---

### Paso 1: Mostrar el estado actual (1 min)

**Narración:** _"Esta es nuestra aplicación de votación funcionando en producción. Pueden ver que las opciones son 'Burritos' y 'Tacos'."_

1. Mostrar la app de votación en el navegador.
2. Emitir un voto y ver cómo se refleja en el panel de resultados (Tab 2).
3. Mostrar que en GitHub Actions no hay pipelines ejecutándose.

---

### Paso 2: Realizar el cambio en el código (2 min)

**Narración:** _"Ahora vamos a hacer un cambio: cambiaremos las opciones de votación de 'Tacos vs Burritos' a 'Pizza vs Hamburguesa'. Sin tocar el servidor."_

```bash
# Crear rama de feature
git checkout main
git pull origin main
git checkout -b feature/vote-cambiar-opciones
```

**Archivo a modificar:** `vote/src/main/java/com/okteto/vote/controller/VoteController.java`

```java
// ANTES (línea 94-95):
private String optionA = "Burritos";
private String optionB = "Tacos";

// DESPUÉS:
private String optionA = "Pizza";
private String optionB = "Hamburguesa";
```

```bash
# Commit y push
git add .
git commit -m "feat(vote): cambiar opciones a Pizza vs Hamburguesa"
git push origin feature/vote-cambiar-opciones
```

---

### Paso 3: Crear Pull Request y hacer Merge (2 min)

**Narración:** _"Creamos un Pull Request siguiendo nuestra estrategia de branching."_

1. Ir a GitHub → Crear Pull Request de `feature/vote-cambiar-opciones` hacia `main`.
2. Mostrar que el pipeline CI se dispara automáticamente al crear el PR.
3. Esperar a que pase el CI (check verde).
4. Hacer Merge (Squash and Merge).

---

### Paso 4: Observar el pipeline en acción (3-5 min)

**Narración:** _"Observen cómo tras el merge, el pipeline CI construye la nueva imagen y luego el pipeline CD la despliega automáticamente."_

1. **Tab 3 (GitHub Actions):** Mostrar el pipeline CI ejecutándose:
   - ✅ Checkout
   - ✅ Build con Maven
   - ✅ Tests
   - ✅ Docker Build & Push
2. Mostrar que al terminar CI, se dispara CD automáticamente:
   - ✅ Helm upgrade vote
   - ✅ Verify deployment

---

### Paso 5: Verificar el resultado (1 min)

**Narración:** _"Ahora al refrescar el navegador, podemos ver que las opciones cambiaron a 'Pizza' y 'Hamburguesa', sin que tocáramos directamente el servidor."_

1. Refrescar Tab 1 (Vote App) → Las opciones ahora dicen "Pizza" y "Hamburguesa".
2. Votar por una opción → Verificar que llega al panel de resultados (Tab 2).

---

### Paso 6: Mostrar la trazabilidad (1 min)

**Narración:** _"Todo el proceso queda trazado en GitHub."_

1. Mostrar en GitHub: el PR mergeado, los checks verdes de CI y CD.
2. Mostrar en Docker Hub: la nueva imagen con el tag del commit SHA.
3. Mostrar en el clúster:
   ```bash
   kubectl get pods  # Pod "vote" fue reiniciado recientemente
   kubectl describe pod -l app=vote | grep Image  # Nueva imagen
   ```

---

## Resumen del Flujo Demostrado

```
Cambio en código → git push → PR → Merge a main
    → CI: Build + Test + Docker Push
        → CD: Helm Upgrade en Kubernetes
            → App actualizada en producción ✅
```

## Tiempo estimado total: 8-10 minutos
