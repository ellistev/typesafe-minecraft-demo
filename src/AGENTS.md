# Controller and model integration

Follow root AGENTS.md. decisions.cjs is the source of truth for generated README questions/actions.

- Observation changes must update documented state fields and the synthetic fixture when relevant.
- Test malformed responses, freshness, cancellation, and terrain behavior when changing those paths.
- Keep inference separate from execution. A terrain veto stops an action; it never selects a replacement.
- Preserve bounded runs and timeout/error stops. Keys must not reach logs or browser responses/assets.
- Never invent explanations and claim they came from TypeSafe.
- Finish with tests, docs:sync, docs:check, and documentation/changelog review.
