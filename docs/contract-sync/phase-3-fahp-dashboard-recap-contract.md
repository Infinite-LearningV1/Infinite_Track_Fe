# Phase 3 FAHP Dashboard Recap Contract Sync

## Purpose
Provide one backend contract of record for the dashboard FE FAHP recap section.

## Route
`GET /analysis/fuzzy-ahp/dashboard-recap`

## Query Parameters
- `category` (optional)
- `analysis_type` (optional)

## Response Shape
```json
{
  "success": true,
  "filter": {
    "category": "discipline",
    "analysis_type": "summary"
  },
  "data": {
    "status": "ready",
    "sections": [
      {
        "key": "discipline",
        "title": "Discipline",
        "summary": "Top category available",
        "topRank": "Tepat Waktu",
        "distribution": {
          "Tepat Waktu": 0.82
        },
        "consistency": 0.04,
        "generatedAt": "2026-06-25T10:00:00.000Z"
      }
    ]
  }
}
```

## Section Semantics
- This endpoint is the only FAHP contract of record for the dashboard recap section.
- Dashboard FE must not call the three existing FAHP analysis endpoints directly for recap rendering.
- This endpoint is independent from the shared dashboard date-window filter.

## Non-Goals
- Not a fallback wrapper for the legacy combined FAHP endpoint.
- Not coupled to dashboard `period` / `from` / `to`.
- Not a replacement for non-dashboard detailed analysis surfaces.
