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

- `src/index.html`, `src/404.html`: the pages. There is no JavaScript.
- `src/css/basic.css`: styles in plain CSS (nesting included). Vite compiles them with Lightning CSS, which flattens nesting and adds vendor prefixes for the browsers in `.browserslistrc`.
- Fonts (Karla, Rubik) are self-hosted from `@fontsource-variable/*` and bundled into `build/assets/`.
- `src/rootfiles/`: copied unchanged to the web root. Includes the favicons and `.htaccess`, which handles the short-link redirects, serving the pre-compressed `.br`/`.gz` files, caching and security headers.
