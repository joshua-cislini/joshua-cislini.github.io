<p align="center">
  <a href="https://joshua-cislini.pages.dev/"><img src="https://joshua-cislini.pages.dev/assets/og-image.png" alt="OG-Image" width="600"></a>
</p>

# [joshua-cislini.github.io](https://joshua-cislini.github.io/) → [joshua-cislini.pages.dev](https://joshua-cislini.pages.dev/)
### [Is the webpage down?](https://joshua-cislini.cronitorstatus.com/)

My personal resume site has moved from GitHub Pages to Cloudflare Pages at **[joshua-cislini.pages.dev](https://joshua-cislini.pages.dev/)**.

This repository now serves as a lightweight client-side redirect so visitors and existing links to `joshua-cislini.github.io` are forwarded automatically.

## Structure
```
index.html   Redirects the root URL (preserving query strings and hashes) and sets the canonical URL
404.html     Forwards any subpath (e.g. /#about) to the matching path on joshua-cislini.pages.dev
.nojekyll    Disables Jekyll processing on GitHub Pages
```
