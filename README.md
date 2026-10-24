# TUNNEL® BarberClub

Static HTML, CSS and JavaScript site. Run locally with `python3 -m http.server 8765`.

## Visual revision — 24 October 2026

Neutral black, white and greys only. Editorial portrait, raised light service panel, photographic treatment illustrations and architectural tunnel depth. The seven supplied services and prices are preserved, including the seven-day Fresh Up condition. No external fonts or stock-image dependencies.

### Original materials and limits

- The official client logo was not found in the repository or the available Library search. The invented inline SVGs have been removed. The header/footer display plain brand text as a temporary fallback, **not an official logo**. Replace it with the client's authorized original asset before final brand sign-off.
- `assets/editorial.webp` is an AI-generated photographic triptych, clearly labeled in the UI. It illustrates haircut, facial mask and hot towel treatments; it does not depict real clients, staff or the shop. Generated with the built-in image generation tool on 24 October 2026. Brief: neutral black-and-white editorial barber portraits and treatment close-ups, realistic skin/cloth, studio lighting, no text/logos. Approved Pinterest screenshots are layout references only and are not copied into the site.
- `https://instagram.com/tunnel.barberclub` is retained from the previous implementation. Ownership/reachability has not been independently verified. No new telephone, address, opening hours or staff information is invented.
- Service buttons open accessible native dialogs. `Ver contacto` closes the dialog and navigates to `#contactos`; `Abrir Instagram` opens the inherited Instagram URL. **Neither action confirms a reservation. There is no booking backend.**
- The previous decorative map and unverified address are omitted pending confirmed premises details.

## Checks

`node --check script.js`

`node tests/site.cjs` runs Playwright against localhost:8765. Install Playwright and its Chromium browser first, or set `BROWSER_EXECUTABLE` to an existing browser. The test checks keyboard-operated service dialogs, Escape, mobile menu, all seven service dialogs, prices, internal contact navigation, and overflow at 320, 390, 768 and 1440 px.
