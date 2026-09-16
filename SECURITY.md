# Security and local data

This is a local prototype, not a hardened multiplayer service. Keep the dashboard on loopback and use a separate test world.

TypeSafe receives the entered goal and structured game observations. The key stays in the Node process and goes only in the API Authorization header. Do not share env files, Windows credentials, launcher accounts, or authentication caches.

Decision logs may contain entered goals, coordinates, and responses. Recordings capture the selected browser surface. Review both before sharing. Never paste keys or private logs into public issues.

If a key is published, revoke it through the provider and remove it from publication history. An ignore rule alone does not fix exposure.

Project hooks run locally and do not read transcripts or environment secrets. Review their source before trusting them. A public vulnerability-reporting contact has not been configured.
