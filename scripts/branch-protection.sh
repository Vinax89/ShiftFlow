#!/usr/bin/env bash
set -euo pipefail
OWNER_REPO="${1:?usage: ./branch-protection.sh <owner/repo>}"
CHECK="ci / spec001"
for BR in main spec-001-fixes; do
  gh api -X PUT \
    repos/$OWNER_REPO/branches/$BR/protection \
    -H 'Accept: application/vnd.github+json' \
    -f enforce_admins=true \
    -f required_pull_request_reviews.required_approving_review_count=1 \
    -f required_status_checks.strict=true \
    -f required_status_checks.contexts[]="$CHECK" \
    -F restrictions='null' >/dev/null
  echo "✔ Protections applied to $BR (required check: $CHECK)"
done