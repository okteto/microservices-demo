# AGENTS.md

## Application

A voting app that runs on Okteto, defined in `okteto.yml`:

- `vote` (Java / Spring Boot): web UI where users vote. Publishes each vote to Kafka.
- `worker` (Go): consumes votes from Kafka and stores them in PostgreSQL.
- `result` (Node.js): reads totals from PostgreSQL and shows them live.
- `infrastructure/` (Helm): PostgreSQL and Kafka.

Images, deploy steps and tests are all declared in `okteto.yml`. Use the `okteto` CLI for everything; do not run `docker build` or `docker run` locally.

## Namespace

Each Claude Code session works in its own Okteto namespace, named `claude-` followed by the first 8 characters of `$CLAUDE_CODE_SESSION_ID`. Some Okteto instances require namespace names to start with a fixed prefix, so the name gets that prefix:

| Okteto context | Required prefix | Namespace name |
| --- | --- | --- |
| `https://staging.okteto.dev` | `staging-` | `staging-claude-<8 chars>` |
| `https://okteto.demo.dev.okteto.net` | `demo-` | `demo-claude-<8 chars>` |
| any other | none | `claude-<8 chars>` |

At the start of the session, work out the name and create the namespace:

```sh
NS="claude-${CLAUDE_CODE_SESSION_ID:0:8}"
case "$(okteto context show | jq -r .name)" in
  https://staging.okteto.dev) NS="staging-$NS" ;;
  https://okteto.demo.dev.okteto.net) NS="demo-$NS" ;;
esac
okteto namespace create "$NS"
echo "$NS"
```

If `okteto namespace create` fails with `'name' must start with '<prefix>-'`, the instance needs a prefix that is not in the table: prepend it, create the namespace again, and add the instance to the table and the `case` above in the same pull request as your other changes.

Shell variables do not persist between commands, so remember the printed name and write it literally in later commands (`<namespace>` below).

`okteto namespace create` also switches the user's current Okteto context to the new namespace. Mention this in your report so the user can switch back with `okteto namespace use <their namespace>`.

The final summary of the session **must** include a clickable link to the namespace in the Okteto UI, so the user can open it directly. The link is the context URL followed by `/#/spaces/<namespace>`, for example `https://okteto.demo.dev.okteto.net/#/spaces/demo-claude-1a2b3c4d`. Get the context URL from `okteto context show | jq -r .name`.

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

### 5. Open a pull request

Once every step above passes, open a pull request without waiting to be asked:

```sh
git checkout -b <short-descriptive-branch>   # if still on main
git add <changed files>
git commit -m "<summary>"
git push -u origin HEAD
gh pr create --base main --title "<summary>" --body "<what changed and how it was verified>"
```

Include the PR URL in your report, together with the link to the namespace in the Okteto UI (see [Namespace](#namespace)). For later rounds of changes on the same task, push new commits to the same branch instead of opening another PR. Never push to `main` directly or merge the PR.

## Notes

- Tests run in their own namespace. Reach the app through its public endpoints (`https://<service>-$OKTETO_NAMESPACE.$OKTETO_DOMAIN`) and internal services with the namespace suffix (e.g. `postgresql.$OKTETO_NAMESPACE`).
- PostgreSQL and Kafka keep data in persistent volumes. After a PostgreSQL major version upgrade, the existing volume cannot be reused: `okteto destroy -v --namespace <namespace>` deletes the app and its volumes, including all data, so confirm with the user before running it.
- CI (`.github/workflows/deploy.yml`) deploys a preview environment named `staging-pr-<number>` for each pull request and runs the `e2e` test against it.
