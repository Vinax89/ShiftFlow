# Runbook

## CI/CD and Performance

This project uses a GitHub Actions workflow (`.github/workflows/ci.yml`) to ensure code quality, build stability, and performance on every pull request to `main` and `spec-001-fixes`.

### Reproducing CI Locally

To reproduce the CI performance checks locally, use the `serve:prod` script. This runs a production build and serves it on port 9000.

```bash
npm run build
npm run start -- -p 9000
```

Once the server is running, you can run Lighthouse against it with the same budgets used in CI:

```bash
npx lighthouse http://localhost:9000 --preset=perf --form-factor=mobile --screenEmulation.mobile --budget-path=./lighthouse-budgets.json
```

The performance budgets are defined in `lighthouse-budgets.json`.

### Known ESLint Warnings

The following ESLint warnings are known and can be safely ignored for now:

- **import-order**: The CI step for linting (`lint:strict`) is allowed to fail if only import-order warnings are present. This will be addressed in a future specification.
