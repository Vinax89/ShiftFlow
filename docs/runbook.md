# Runbook

## CI/CD and Performance

This project uses a GitHub Actions workflow (`.github/workflows/ci.yml`) to ensure code quality, build stability, and performance on every pull request to `main` and `spec-001-fixes`.

### Reproducing CI Locally

To reproduce the CI performance checks locally, use the `serve:prod` script. This runs a production build and serves it on port 9000.

```bash
npm run serve:prod
```

Once the server is running, you can run Lighthouse against it with the same budgets used in CI:

```bash
npx lighthouse http://localhost:9000 --preset=perf --form-factor=mobile --screenEmulation.mobile --budget-path=./lighthouse-budgets.json
```

The performance budgets are defined in `lighthouse-budgets.json`.

### Seeding Development Data

To seed your local Firestore emulator with development data, first set the required environment variables in a `.env.local` file at the root of the project:

```
SEED_EMAIL=your-dev-email@example.com
SEED_PASS=your-dev-password
```

Then, run the seed script:

```bash
npm run seed:dev
```

### API Smoke Tests

You can use `curl` to quickly check that the basic APIs are responding. The port may vary depending on how you're running the app (e.g., `serve:prod` vs `serve:prod:auto`).

```bash
# Health
curl -i http://localhost:9000/api/healthz

# Budget bootstrap (creates baseline plan/envelopes on first run)
curl -i -H 'x-dev-auth-uid: dev-user' -H 'content-type: application/json' \
  -d '{"tenantId":"dev","dates":["'"$(date +%F)"'"]}' \
  http://localhost:9000/api/budget/recompute

# Read current period (first ~40 lines)
curl -sS -H 'x-dev-auth-uid: dev-user' \
  "http://localhost:9000/api/budget/read?tenantId=dev" | head -n 40
```

### E2E and Runbook for Categorizer Tools

```bash
# Build & auto-pick a port
npm run serve:prod:auto
# Note the printed port, then:
PORT=<PORT>

# Open Categorizer settings; run Dry run and Apply
xdg-open http://localhost:$PORT/settings/categorizer || open http://localhost:$PORT/settings/categorizer

# API: dry run
curl -sS -H 'x-dev-auth-uid: dev-user' -H 'content-type: application/json' \
  -d '{"tenantId":"dev","days":7,"dryRun":true}' \
  http://localhost:$PORT/api/categorizer/apply | jq '.updated, .dates, .preview[0]'

# Apply for real
curl -sS -H 'x-dev-auth-uid: dev-user' -H 'content-type: application/json' \
  -d '{"tenantId":"dev","days":7,"dryRun":false}' \
  http://localhost:$PORT/api/categorizer/apply | jq '.updated, .recomputed'

# Run E2E tests
npx playwright install --with-deps
BASE_URL=http://localhost:$PORT npx playwright test tests/e2e/categorizer-apply.spec.ts
```

### Known ESLint Warnings

The following ESLint warnings are known and can be safely ignored for now:

- **import-order**: The CI step for linting (`lint:strict`) is allowed to fail if only import-order warnings are present. This will be addressed in a future specification.
