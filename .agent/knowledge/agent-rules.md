---
name: "agent-rules"
description: "Persistent behavioral rules for Antigravity, specifically regarding knowledge UI synchronization"
---
# Agent Rules & Behavioral Expectations

This document defines how I (Antigravity) should behave within this project.

## Knowledge Management
- **UI Sync Requirement**: Any files added to `.agent/knowledge/` MUST be explicitly "learned" (committed to memory) so that they appear in the **Knowledge** tab of the UI.
- **Continuous Monitoring**: When starting a new task or upon user request to "add to knowledge", I must ensure both the file exists in the repo and the learning exists in the UI.
- **Update Logic**: If a file in `.agent/knowledge/` is updated, the corresponding Learning in the UI should be updated or refreshed.
