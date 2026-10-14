# AGENTS.md

## Application

A voting app that runs on Okteto, defined in `okteto.yml`:

- `vote` (Java / Spring Boot): web UI where users vote. Publishes each vote to Kafka.
- `worker` (Go): consumes votes from Kafka and stores them in PostgreSQL.
- `result` (Node.js): reads totals from PostgreSQL and shows them live.
- `infrastructure/` (Helm): PostgreSQL and Kafka.

Images, deploy steps, dev containers and tests are all declared in `okteto.yml`. Use the `okteto` CLI for everything; do not run `docker build` or `docker run` locally.

## Devflow

Run this loop after every round of changes, and do not report the work as done until every step passes.

### 1. Deploy

```sh
okteto deploy
```

This builds every image in the `build` section (skipping unchanged ones) and runs the `deploy` commands.

### 2. If the build fails, troubleshoot one image at a time

Build only the failing image, using its key from the `build` section of `okteto.yml`:

```sh
okteto build result
okteto build vote
okteto build worker
okteto build vote-dev   # dev target of vote
okteto build dev        # dev target of worker
```

Fix the error, rebuild that image until it succeeds, then go back to step 1.

### 3. Make sure the deploy finished and all pods are healthy

After `okteto deploy` succeeds, check the namespace at the Kubernetes level:

```sh
okteto kubeconfig
kubectl get pods
```

Every pod must be `Running` and `READY`, with no restarts piling up. If not, troubleshoot:

```sh
kubectl describe pod <pod>
kubectl logs deploy/<name>              # vote, worker, result, postgresql, kafka
kubectl logs deploy/<name> --previous   # after a crash
okteto endpoints                        # public URLs of vote and result
```

Fix the cause and go back to step 1.

### 4. Run the tests

```sh
okteto test
```

This runs every test in the `test` section of `okteto.yml`:

- `unit`: result unit tests (`result/test`).
- `e2e`: casts a vote on the public vote endpoint and checks that it reaches PostgreSQL and shows up on the result endpoint (`e2e/test`).

Run one test with `okteto test unit` or `okteto test e2e`. If a test fails, troubleshoot, fix, and go back to step 1.

## Notes

- Tests run in their own namespace. Reach the app through its public endpoints (`https://<service>-$OKTETO_NAMESPACE.$OKTETO_DOMAIN`) and internal services with the namespace suffix (e.g. `postgresql.$OKTETO_NAMESPACE`).
- PostgreSQL and Kafka keep data in persistent volumes. After a PostgreSQL major version upgrade, the existing volume cannot be reused: `okteto destroy -v` deletes the app and its volumes, including all data, so confirm with the user before running it.
- CI (`.github/workflows/deploy.yml`) deploys a preview environment named `staging-pr-<number>` for each pull request and runs the `e2e` test against it.
