#!/usr/bin/env bash
set -euo pipefail
# Usage: ./scripts/rulesets-path-checks.sh <owner/repo> [branch=main] [branch2=spec-001-fixes]
# Requires: gh CLI authenticated with a token that has Admin:repo_hook + Contents:write

OWNER_REPO="${1:?usage: $0 <owner/repo> [branch] [branch2]}"
BR1="${2:-main}"
BR2="${3:-spec-001-fixes}"

# ---- Configure workflow files to require (adjust to your repo filenames) ----
REQ_WORKFLOWS=(
  ".github/workflows/nodejs.yml"
  ".github/workflows/codeql.yml"
  ".github/workflows/bearer.yml"
  ".github/workflows/apisec.yml"
)

# Resolve repo metadata
read -r OWNER REPO <<<"$(awk -F/ '{print $1" "$2}' <<<"$OWNER_REPO")"
REPO_JSON=$(gh api repos/$OWNER/$REPO)
REPO_ID=$(jq -r '.id' <<<"$REPO_JSON")

create_or_update_ruleset() {
  local NAME=$1; shift
  local PATH_INCLUDE=$1; shift
  local RS_JSON RS_ID EXIST

  # Build workflows array payload with repo id
  local WF_JSON
  WF_JSON=$(jq -n --argjson repo_id "$REPO_ID" --argjson dummy 0 \
    --argfile wf <(printf '%s\n' "${REQ_WORKFLOWS[@]}" | jq -R . | jq -s .) \
    '[$wf[] | {path: ., repository_id: $repo_id}]')

  # Compose base payload
  RS_JSON=$(jq -n \
    --arg name "$NAME" \
    --arg path "$PATH_INCLUDE" \
    --arg br1 "$BR1" --arg br2 "$BR2" \
    --argjson repo_id "$REPO_ID" \
    --argjson workflows "$WF_JSON" \
    '{
      name: $name,
      target: "branch",
      enforcement: "active",
      conditions: {
        ref_name: { include: ["refs/heads/"+$br1, "refs/heads/"+$br2] },
        file_path: { include: [$path] }
      },
      rules: [
        {
          type: "workflows",
          parameters: {
            do_not_enforce_on_create: true,
            workflows: $workflows
          }
        }
      ]
    }')

  # Find existing ruleset by name
  EXIST=$(gh api -X GET repos/$OWNER/$REPO/rulesets --paginate | jq -r --arg name "$NAME" '.[] | select(.name==$name) | .id' | head -n1 || true)

  if [[ -n "$EXIST" ]]; then
    echo "Updating ruleset '$NAME' (id=$EXIST)"
    gh api -X PUT repos/$OWNER/$REPO/rulesets/$EXIST \
      -H 'Accept: application/vnd.github+json' \
      --input <(printf '%s' "$RS_JSON") >/dev/null
  else
    echo "Creating ruleset '$NAME'"
    gh api -X POST repos/$OWNER/$REPO/rulesets \
      -H 'Accept: application/vnd.github+json' \
      --input <(printf '%s' "$RS_JSON") >/dev/null
  fi
}

create_or_update_ruleset "Require CI for /engine/**"    "engine/**"
create_or_update_ruleset "Require CI for /functions/**" "functions/**"

echo "✔ Path‑scoped rulesets ensured for $OWNER_REPO on branches: $BR1, $BR2"
