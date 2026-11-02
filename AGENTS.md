# AGENTS.md

## Application

A voting app that runs on Okteto, defined in `okteto.yml`:

- `vote` (Java / Spring Boot): web UI where users vote. Publishes each vote to Kafka.
- `worker` (Go): consumes votes from Kafka and stores them in PostgreSQL.
- `result` (Node.js): reads totals from PostgreSQL and shows them live.
- `infrastructure/` (Helm): PostgreSQL and Kafka.

Images, deploy steps, dev containers and tests are all declared in `okteto.yml`. Use the `okteto` CLI for everything; do not run `docker build` or `docker run` locally.

## Namespace

Each Claude Code session works in its own Okteto namespace, named `claude-` followed by the first 8 characters of `$CLAUDE_CODE_SESSION_ID`. If the Okteto context is `https://staging.okteto.dev`, the name also needs the user's GitHub username as a suffix (`claude-<8 chars>-<username>`). On that context, the Okteto username shown by `okteto context show` is the GitHub username.

At the start of the session, work out the name and create the namespace:

```sh
NS="claude-${CLAUDE_CODE_SESSION_ID:0:8}"
CTX=$(okteto context show)
if [ "$(echo "$CTX" | jq -r .name)" = "https://staging.okteto.dev" ]; then
  NS="$NS-$(echo "$CTX" | jq -r .username)"
fi
okteto namespace create "$NS"
echo "$NS"
```

Shell variables do not persist between commands, so remember the printed name and write it literally in later commands (`<namespace>` below).

Pass `--namespace <namespace>` to every `okteto` command that accepts it (`build`, `deploy`, `test`, `endpoints`, `destroy`, ...), and `-n <namespace>` to every `kubectl` command. Never rely on the current Okteto context or kubeconfig namespace: it is shared with other sessions and with the user.

## Devflow

Run this loop after every round of changes, and do not report the work as done until every step passes.

### 1. Deploy

```sh
okteto deploy --namespace <namespace>
```

This builds every image in the `build` section (skipping unchanged ones) and runs the `deploy` commands.

### 2. If the build fails, troubleshoot one image at a time

Build only the failing image, using its key from the `build` section of `okteto.yml`:

```sh
okteto build result --namespace <namespace>
okteto build vote --namespace <namespace>
okteto build worker --namespace <namespace>
okteto build vote-dev --namespace <namespace>   # dev target of vote
okteto build dev --namespace <namespace>        # dev target of worker
```

Fix the error, rebuild that image until it succeeds, then go back to step 1.

### 3. Make sure the deploy finished and all pods are healthy

After `okteto deploy` succeeds, check the namespace at the Kubernetes level:

```sh
okteto kubeconfig
kubectl get pods -n <namespace>
```

Every pod must be `Running` and `READY`, with no restarts piling up. If not, troubleshoot:

```sh
kubectl describe pod <pod> -n <namespace>
kubectl logs deploy/<name> -n <namespace>              # vote, worker, result, postgresql, kafka
kubectl logs deploy/<name> -n <namespace> --previous   # after a crash
okteto endpoints --namespace <namespace>               # public URLs of vote and result
```

Fix the cause and go back to step 1.

### 4. Run the tests

```sh
okteto test --namespace <namespace>
```

This runs every test in the `test` section of `okteto.yml`:

- `unit`: result unit tests (`result/test`).
- `e2e`: casts a vote on the public vote endpoint and checks that it reaches PostgreSQL and shows up on the result endpoint (`e2e/test`).

Run one test with `okteto test unit --namespace <namespace>` or `okteto test e2e --namespace <namespace>`. If a test fails, troubleshoot, fix, and go back to step 1.

## Notes

- Tests run in their own namespace. Reach the app through its public endpoints (`https://<service>-$OKTETO_NAMESPACE.$OKTETO_DOMAIN`) and internal services with the namespace suffix (e.g. `postgresql.$OKTETO_NAMESPACE`).
- PostgreSQL and Kafka keep data in persistent volumes. After a PostgreSQL major version upgrade, the existing volume cannot be reused: `okteto destroy -v --namespace <namespace>` deletes the app and its volumes, including all data, so confirm with the user before running it.
- CI (`.github/workflows/deploy.yml`) deploys a preview environment named `staging-pr-<number>` for each pull request and runs the `e2e` test against it.
