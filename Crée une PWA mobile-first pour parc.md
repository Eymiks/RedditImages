Crée une PWA mobile-first pour parcourir Reddit avec un focus sur les images.

## Stack

* Vite + React + TypeScript
* Tailwind CSS
* PWA (manifest + service worker via vite-plugin-pwa)

## Fonctionnalités

### Navigation

* Saisie manuelle d'un subreddit
* Liste de subreddits favoris (persistés en localStorage)
* Accès aux custom feeds Reddit de l'utilisateur connecté (multireddits)
* Tri : hot / new / top (avec période : day / week / month / year / all)

### Affichage

* Grille de thumbnails en 2 colonnes, scroll infini (pagination via le token `after`)
* Filtrer uniquement les posts avec images :

  * post\_hint === 'image'
  * is\_gallery === true
  * URL finissant en .jpg / .png / .gif / .webp
* Décoder les URLs preview (les `\\\&amp;` → `\\\&`)
* Gérer les galleries Reddit : lire `gallery\\\_data.items` + `media\\\_metadata\\\[id].s.u`
* Ignorer les posts v.redd.it (vidéos HLS) en v1
* Convertir imgur `.gifv` → `.mp4`

### Visionneuse plein écran

* S'ouvre au tap sur une image
* Carousel swipeable horizontal (Embla Carousel)
* Pinch-to-zoom (react-zoom-pan-pinch)
* Précharge l'image suivante et précédente
* Affiche le titre du post et le subreddit source

## API Reddit

### Sans authentification

Endpoint : https://www.reddit.com/r/{sub}/{sort}.json?limit=50\&after={token}
Toujours inclure le header User-Agent: MyRedditImageApp/1.0

### Avec authentification (OAuth PKCE)

* App Reddit de type "installed app" (pas de client secret)
* Flow : Authorization Code + PKCE
* Scopes : identity read mysubreddits
* Token stocké en localStorage, refresh automatique à expiration (1h)
* Appels via oauth.reddit.com (résout le CORS, pas besoin de proxy)
* Endpoint custom feeds : GET /api/multi/mine → liste les feeds
* Posts d'un feed : GET /user/{username}/m/{feedname}/{sort}.json

## Authentification Reddit

* Bouton "Se connecter avec Reddit" visible dans le header
* Déclenche le flow PKCE (redirection vers reddit.com/api/v1/authorize)
* Callback géré en /callback
* Une fois connecté : affiche l'avatar + username, débloque l'onglet "Mes feeds"
* Bouton de déconnexion (supprime les tokens)

## Architecture

src/
api/
reddit.ts         fetch subreddit / multireddit, pagination
auth.ts           PKCE flow, token storage, refresh
imageFilter.ts    normalisation des posts en images
components/
SubredditInput.tsx
FeedSelector.tsx  onglets : Subreddits | Favoris | Mes feeds
SortBar.tsx
ImageGrid.tsx
ImageViewer.tsx   plein écran + swipe + zoom
AuthButton.tsx
hooks/
useFeed.ts        fetch + pagination + cache
useFavorites.ts   localStorage
store/
auth.ts           état global du token
worker/
index.js            Cloudflare Worker proxy

## UX \& détails

* Skeleton loaders pendant le chargement
* Infinite scroll via IntersectionObserver
* Badge NSFW sur les thumbnails (indiquer, pas masquer)
* Gestion des erreurs : subreddit inexistant, rate limit 429 → retry après 6s
* Responsive : max-width 430px centré sur desktop
* Touch target minimum 44px pour tous les éléments interactifs

## Fichiers de config à générer

* vite.config.ts avec vite-plugin-pwa
* public/manifest.json (icône, couleurs dark green)
* .env.example avec VITE\_REDDIT\_CLIENT\_ID et VITE\_WORKER\_URL
* README.md avec instructions de setup (création app Reddit, déploiement Worker)

