# Self-hosting the fonts

Why: no request to Google on every page view (faster, and better for visitor privacy / GDPR / Swiss FADP),
and the site keeps working if Google Fonts is blocked or down.

## What is already done in this repo
`fonts/` contains the **Latin subset** (covers Italian, English, French, German) of:

| File | Font | Used for |
|---|---|---|
| `inter-latin-wght-normal.woff2` | Inter (variable, weights 100–900) | body text |
| `dm-serif-display-latin-400-normal.woff2` | DM Serif Display 400 | headings |

Both are SIL Open Font License (licenses included next to the files). `index.html` has the matching
`@font-face` rules (`font-display: swap`) and `<link rel="preload">` tags, and the CSP only allows `font-src 'self'`.

## Doing it yourself for another font (Fontsource, recommended)
1. In any temp folder: `npm init -y && npm i @fontsource-variable/inter @fontsource/dm-serif-display`
   (swap in any package from https://fontsource.org – variable fonts are named `@fontsource-variable/<name>`).
2. Open `node_modules/@fontsource*/<name>/files/` and copy the `*-latin-*-normal.woff2` file(s) you need into `fonts/`.
   - Need accents beyond Western European? Also copy the `latin-ext` file.
   - Static fonts: one file per weight (e.g. `-400-`, `-700-`). Variable fonts: one `wght` file for all weights.
3. Add an `@font-face` per file in the `<style>` block of `index.html`:
   ```css
   @font-face {
     font-family: "Inter";
     src: url("fonts/inter-latin-wght-normal.woff2") format("woff2");
     font-weight: 100 900;      /* a range for variable fonts, a single value for static ones */
     font-style: normal;
     font-display: swap;
   }
   ```
4. Preload the one or two files used above the fold (the `crossorigin` attribute is required even for same-origin fonts):
   ```html
   <link rel="preload" href="fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
   ```
5. Remove every `fonts.googleapis.com` / `fonts.gstatic.com` link, and make sure the CSP has `font-src 'self'`.
6. Check: DevTools → Network → filter "Font": files load from your own domain, status 200.

## Alternative: google-webfonts-helper
https://gwfh.mranftl.com/fonts – pick the font, charsets and weights, download the zip, copy the `.woff2`
files into `fonts/` and paste the CSS it generates (change the `url()` paths to `fonts/...`).

## Tips
- Only ship the weights you use; each extra file costs bandwidth.
- Keep the "Inter Fallback" `@font-face` in `index.html`: it reduces layout shift while the real font loads.
- Always keep the license file for each font in `fonts/`.
