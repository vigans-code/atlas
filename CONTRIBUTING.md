# Contributing to Atlas

Thanks for improving Atlas. Keep changes focused, secure, documented, and easy to review.

## Development setup

1. Install Node.js 22.12 or newer.
2. Run `npm ci` from `frontend`.
3. Run `npm run desktop:dev` for Electron or `npm run dev` for the browser renderer.
4. Use Docker Compose when working on the FastAPI service, PostgreSQL, or Redis.

## Before opening a change

Run these frontend checks:

```powershell
npm run lint
npm run build
npm audit
```

Backend changes should also pass `pytest` and `ruff check .`.

## Design rules

- Keep Chat, Code Agent, Projects, Images, and Settings independent.
- Add optional capabilities through the feature registry instead of primary navigation.
- Clearly label unavailable or experimental behavior.
- Never expose provider secrets to the renderer.
- Respect reduced-motion, keyboard navigation, and contrast preferences.
- Include documentation and tests when behavior changes.

## Security

Do not report exploitable vulnerabilities in public issues. Follow [SECURITY.md](SECURITY.md).
