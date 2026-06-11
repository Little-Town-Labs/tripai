# Continuous Integration

TripAI CI runs on a repository-scoped GitHub Actions self-hosted runner on `aegis-prod`.

## Runner

- Repository: `Little-Town-Labs/tripai`
- Runner name: `aegis-tripai-ci`
- Required labels: `self-hosted`, `Linux`, `ARM64`, `tripai-ci`
- Service user: `tripai-runner`
- Runner path: `/home/tripai-runner/actions-runner`
- Systemd unit: `actions.runner.Little-Town-Labs-tripai.aegis-tripai-ci.service`

The runner is dedicated to TripAI. CI jobs run inside the workflow container image rather than directly on the host. Do not connect TripAI CI jobs to the OvernightDesk Docker network unless a future task explicitly requires it.

## Workflow

The main workflow is `.github/workflows/ci.yml`.

It runs on:

- pull requests
- pushes to `main`
- pushes to numbered feature branches
- manual dispatch from GitHub Actions

The current verification job runs:

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:e2e`

## Operations

Check runner state from GitHub:

```bash
gh api repos/Little-Town-Labs/tripai/actions/runners \
  --jq '.runners[] | select(.name=="aegis-tripai-ci")'
```

Check runner state on `aegis-prod`:

```bash
ssh -i ~/.ssh/ssh-key-2026-03-15 ubuntu@147.224.183.55 \
  'systemctl --no-pager --full status actions.runner.Little-Town-Labs-tripai.aegis-tripai-ci.service'
```

Restart the service only if the runner is offline or wedged:

```bash
ssh -i ~/.ssh/ssh-key-2026-03-15 ubuntu@147.224.183.55 \
  'sudo systemctl restart actions.runner.Little-Town-Labs-tripai.aegis-tripai-ci.service'
```

Do not commit runner tokens, GitHub registration tokens, Neon connection strings, or app secrets.
