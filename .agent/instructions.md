# Project-Wide Agent Instructions

These instructions define persistent behavioral expectations for any agent working on the `SolSum_2.0` project.

## Knowledge Management & UI Synchronization
- **Mandatory UI Sync**: Any time new information is added to the `.agent/knowledge/` directory, it MUST be mirrored as a **Learning** in the agent's persistent memory. This ensures it appears in the **Knowledge** tab of the Antigravity UI for the user.
- **Verification**: When starting a new session or task, check `.agent/knowledge/` and confirm that all key context is present in the UI Learnings. If not, re-learn the content immediately.
- **Reference**: Always refer to `.agent/knowledge/server_context.md` for server-specific information before attempting SSH or deployment tasks.
