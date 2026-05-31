# INF-160 / INF-171 Sync Drafts (2026-05-30)

Paste-ready update drafts for Linear sync.

## INF-160

This branch update is intentionally minimal and implements INF-171 summary search+period refactor only. Scope is limited to summary-report consumer contract adoption and does not touch cockpit, map, or Fuzzy AHP behavior.

## INF-171

FE summary-report consumer has migrated to canonical contract usage: endpoint `/api/summary/reports`, search parameter `q`, and period values `daily | weekly | monthly | range`. FE no longer sends alias search keys/period aliases and no longer sends `all` on this path (backend compatibility aliases may still be accepted, but FE does not emit them).
