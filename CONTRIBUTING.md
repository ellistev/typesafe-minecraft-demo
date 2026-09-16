# Contributing

Read AGENTS.md and README.md. Keep the demo focused and distinguish real TypeSafe decisions, synthetic tests, and actual Minecraft gameplay.

## Workflow

1. Install Node.js 22+ and run `npm ci`.
2. Make focused changes and add meaningful tests for changed behavior.
3. Run `npm test`, `npm run docs:sync`, and `npm run docs:check`.
4. Review README setup, payload, limitations, and status. Update affected docs and CHANGELOG.md with actual validation.
5. Review the diff for secrets/personal information before committing.

The README request block is generated from src/decisions.cjs and docs/example-state.cjs. Edit those inputs, then regenerate. Fixture values are illustrative, never recorded gameplay.

## Codex hooks

The project `.codex/hooks.json` runs scripts/docs-hook.cjs at UserPromptSubmit and Stop. It locates the project by package name from the working directory upward, including from subdirectories or a nested private checkout.

Trust the project layer and review/trust the hook definitions through `/hooks`. Installation does not bypass trust. Hash snapshots go in runtime/doc-hooks. Stop updates the generated README section and requests at most one continuation if meaningful work has no changelog update. Hooks cannot judge whether prose or validation claims are true; the agent must follow AGENTS.md.

Tests run without Codex, Minecraft, network access, or API keys. Reload older sessions to discover the new configuration. Do not claim lifecycle activation based only on direct script tests.

## Public release checklist

- Publish a reviewed project-only directory with fresh Git history. Never publish the containing private checkout or its commits.
- Exclude memory/, runtime/, node_modules/, env files, recordings, credentials, logs, server JARs, and game worlds.
- Ignore rules do not untrack files or erase history. Review `git ls-files` and the complete publication tree, including hidden files, before pushing.
- Include .env.example, agent instructions, .codex/hooks.json, source, tests, docs, and package-lock.json.
- Choose a license before describing the project as open source. None is selected by this scaffold.
- Verify gameplay and recording before presenting them as proven; qualify latency claims with measured evidence.
- Do not redistribute Minecraft binaries or world assets with this source repository.
- Create/publish the GitHub repository only when explicitly requested.

GitHub Actions runs offline tests and checks README payload drift. It consumes no TypeSafe credits and does not start Minecraft.
