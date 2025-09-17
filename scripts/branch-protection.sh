
#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/branch-protection.sh <owner/repo>
# Example: ./scripts/branch-protection.sh yourname/yourrepo

OWNER_REPO="${1:?usage: $0 <owner/repo>}"

# Required checks before merge (exact names as seen in PR checks)
checks=(
  "Node.js CI / build (22.x)"
  "SAST (Bearer) / pr-diff"
  "APIsec DAST / Scan APIs"
)

for BR in main spec-001-fixes; do
  args=(
    -X PUT \
    -H 'Accept: application/vnd.github+json' \
    "repos/${OWNER_REPO}/branches/${BR}/protection" \
    -f enforce_admins=true \
    -f required_status_checks.strict=true \
    -f required_pull_request_reviews.required_approving_review_count=1 \
    -f required_pull_request_reviews.require_code_owner_reviews=true \
    -f required_pull_request_reviews.dismiss_stale_reviews=true \
    -f required_pull_request_reviews.required_review_thread_resolution=true
  )
  for c in "${checks[@]}"; do
    args+=( -f "required_status_checks.contexts[]=${c}" )
  done
  args+=( -F restrictions='null' )

  gh api "${args[@]}" >/dev/null
  echo "✔ Protections applied to ${BR}: required checks → ${checks[*]} + CODEOWNERS reviews"

done
