# Reddit Images PWA

PWA mobile-first pour parcourir Reddit avec un focus images: subreddits publics, favoris locaux, Redgifs, grille infinie, galleries, viewer plein ecran avec swipe et zoom.

## Installation

```bash
npm install
npm run dev
```

Copie `.env.example` en `.env` puis renseigne:

```bash
VITE_WORKER_URL=https://ton-worker.workers.dev
```

En developpement, `VITE_WORKER_URL` peut rester vide: l'app tente d'abord `old.reddit.com` en direct, puis Vite utilise un proxy local `/reddit-public` en secours. En production, configure le Worker ou le proxy Node pour les fallbacks et Redgifs.

## Acces Reddit

L'app utilise les endpoints JSON publics:

```text
https://old.reddit.com/r/{subreddit}/{sort}.json?limit=25&after={token}&raw_json=1
```

Aucune cle API Reddit n'est necessaire pour cette version. L'app tente ces URLs en direct depuis le navigateur, puis utilise `VITE_WORKER_URL` seulement en secours. Les custom feeds prives et les donnees utilisateur ne sont pas disponibles sans OAuth.

## Worker Cloudflare

Le Worker sert de fallback quand les appels directs Reddit echouent et ajoute:

```http
User-Agent: MyRedditImageApp/1.0
```

Deploie `worker/index.js`, puis renseigne son URL dans `VITE_WORKER_URL`.

```bash
npm install
npx wrangler login
npm run worker:deploy
```

Wrangler affiche une URL du type:

```text
https://reddit-image-pwa-proxy.<ton-compte>.workers.dev
```

Mets cette URL dans `.env`:

```bash
VITE_WORKER_URL=https://reddit-image-pwa-proxy.<ton-compte>.workers.dev
```

Puis redemarre Vite:

```bash
npm run dev
```

Endpoint expose:

```text
GET /reddit?url=https%3A%2F%2Fold.reddit.com%2Fr%2Fpics%2Fhot.json%3Flimit%3D25
GET /redgifs?id=redgifsid
```

Si Reddit bloque Cloudflare avec `You've been blocked by network security`, utilise plutot le proxy Node generique.

## Proxy Node Generique

Le proxy Node expose les memes routes que le Worker, mais peut etre lance localement ou deploye sur Render, Railway, Fly.io ou un VPS.

Local:

```bash
npm run proxy:start
```

Puis mets:

```bash
VITE_WORKER_URL=http://127.0.0.1:8787
```

Render:

1. Pousse ce projet sur GitHub.
2. Dans Render, cree un `New Web Service`.
3. Choisis le repo.
4. Render detecte `render.yaml`.
5. Une fois deploye, mets l'URL Render dans `.env`:

```bash
VITE_WORKER_URL=https://ton-service.onrender.com
```

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

## Limites v1

- Les videos `v.redd.it` sont ignorees.
- Les liens `redgifs.com/watch/{id}` sont resolus via l'API Redgifs et affiches comme videos quand Redgifs fournit une source lisible.
- Les `.gifv` Imgur sont convertis en `.mp4`.
- Les custom feeds et donnees utilisateur ne sont pas inclus, car Reddit ne fournit plus facilement de nouvelles cles OAuth classiques.
