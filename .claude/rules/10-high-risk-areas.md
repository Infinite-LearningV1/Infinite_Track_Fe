# High-risk areas

Derived from `CLAUDE.md`. If this file and `CLAUDE.md` differ, `CLAUDE.md` is canonical.

Explain impact before changing these files or areas:
- `src/js/config/env.js`
- `src/js/services/**`
- `src/js/features/signinHandler.js`
- `src/js/utils/authGuard.js`
- `src/js/utils/roleBasedAccess.js`
- `src/js/utils/storageManager.js`
- `webpack.config.js`
- `DEPLOYMENT.md`
- `DEPLOYMENT-CHECKLIST.md`

Also treat these behaviors as high-risk:
- sign-in and redirect flow
- token/session storage and expiry handling
- route guards and role-based access behavior
- dashboard summary and analytics rendering
- export PDF/Excel behavior
- map/location visualization
- service/API integration consistency
- env/build/deploy behavior
- shared UI logic and maintainability hotspots
