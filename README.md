# Adi Scholar frontend

The React frontend for Adi Scholar, the scholarship application and administration portal.

## Run locally

```sh
npm i
cp .env.example .env
```

Set these values in `.env`:

```ini
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_API_URL=http://localhost:8000/api
```

Start the frontend with `npm run dev`. The backend is expected at `http://localhost:8000/api`.

## Checks

Run `npm run lint` and `npm run build` before opening a pull request.

## Design

See [docs/design-tokens.md](docs/design-tokens.md) and [CLAUDE.md](CLAUDE.md) for the portal’s visual and accessibility guardrails.
