# stereob.it

Source for [stereob.it](https://stereob.it), a single static page built with [Vite](https://vite.dev).

## Requirements

Node.js 22.12 or newer. The pinned version is in `.nvmrc`:

```sh
nvm use
npm install
```

## Development

```sh
npm start         # dev server on http://localhost:3000
npm run build     # production build into build/
npm run preview   # serve build/ locally
npm run format    # format with Prettier
```

## Deployment

```sh
npm run deploy
```

This cleans, builds and rsyncs `build/` to the server. It reads the target from a `.env` file, which is not committed:

```sh
SSH_URL=user@host:/path/to/webroot/
```

## Layout

- `src/index.html`, `src/404.html`: the pages. The JS entry is injected at build time (see `vite.config.js`).
- `src/index.js`: entry point. Imports the styles and swaps in the web fonts once the page has loaded.
- `src/css/basic.scss`: styles, built on top of `normalize.css` and autoprefixed using `.browserslistrc`.
- `src/rootfiles/`: copied unchanged to the web root. Includes `.htaccess`, which handles the short-link redirects, serving the pre-gzipped `.gz` files, caching and security headers.
