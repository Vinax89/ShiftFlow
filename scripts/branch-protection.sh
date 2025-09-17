#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/branch-protection.sh <owner/repo>
# Example: ./scripts/branch-protection.sh yourname/yourrepo

OWNER_REPO="${1:?usage: $0 <owner/repo>}"

# Required checks we want green before merge
# Adjust names to match your repo’s workflow/job/matrix labels exactly.
# Tip: Inspect latest PR checks via: gh pr checks <PR_NUMBER>
checks=(
  "Node.js CI / build (22.x)"      # matrix job on Node 22
  "SAST (Bearer) / pr-diff"        # PR diff scan gate
  "ci / spec001"                   # legacy SPEC‑001 gate (keep if present)
)

for BR in main spec-001-fixes; do
  args=(
    -X PUT \
    -H 'Accept: application/vnd.github+json' \
    "repos/${OWNER_REPO}/branches/${BR}/protection" \
    -f enforce_admins=true \
    -f required_pull_request_reviews.required_approving_review_count=1 \
    -f required_status_checks.strict=true
  )
  # Append contexts
  for c in "${checks[@]}"; do
    args+=( -f "required_status_checks.contexts[]=${c}" )
  done
  # No push restrictions
  args+=( -F restrictions='null' )

  gh api "${args[@]}" >/dev/null
  echo "✔ Protections applied to ${BR} (required: ${checks[*]})"

done
