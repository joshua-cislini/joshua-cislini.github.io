import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const fontOpts = {
    fontFiles: [
        path.join(root, 'fonts/Inter.ttf'),
        path.join(root, 'fonts/DMSerifDisplay.ttf'),
    ],
    loadSystemFonts: false,
    defaultFontFamily: 'Inter',
};

// ---------- helpers ----------

const decodeEntities = (s) =>
    s.replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const escapeXml = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** content="" of <meta name|property="key" ...>, or undefined */
function metaContent(html, key) {
    for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
        const id = tag.match(/\b(?:name|property)\s*=\s*"([^"]*)"/i)?.[1];
        if (id === key) {
            const c = tag.match(/\bcontent\s*=\s*"([^"]*)"/i)?.[1];
            if (c !== undefined) return decodeEntities(c).trim();
        }
    }
    return undefined;
}

/** First Person found in any JSON-LD block (as mainEntity or top level) */
function findPerson(html) {
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
        try {
            const data = JSON.parse(m[1]);
            const person = data.mainEntity?.['@type'] === 'Person' ? data.mainEntity
                : data['@type'] === 'Person' ? data : null;
            if (person) return person;
        } catch {
            console.warn('Skipping a JSON-LD block that failed to parse.');
        }
    }
    return {};
}

/** Layout width of a single line of text, measured with the real fonts */
function measure(text, family, size) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="400">` +
        `<text x="0" y="300" font-family="${family}" font-size="${size}">${escapeXml(text)}</text></svg>`;
    return text ? new Resvg(svg, { font: fontOpts }).innerBBox()?.width ?? 0 : 0;
}

/** Shrink the font size (never below 60%) until the text fits maxWidth */
function fit(text, family, size, maxWidth) {
    const width = measure(text, family, size);
    if (width <= maxWidth) return { size, width };
    const scaled = Math.max(size * 0.6, Math.floor((size * maxWidth / width) * 10) / 10);
    return { size: scaled, width: measure(text, family, scaled) };
}

const getAttr = (svg, id, attr) =>
    svg.match(new RegExp(`<[^>]*\\bid="${id}"[^>]*?\\b${attr}="([^"]*)"`))?.[1];

function setAttr(svg, id, attr, value) {
    const re = new RegExp(`(<[^>]*\\bid="${id}"[^>]*?\\b${attr}=")[^"]*(")`);
    if (!re.test(svg)) throw new Error(`Template has no #${id} with attribute ${attr}`);
    return svg.replace(re, (_, a, b) => `${a}${value}${b}`);
}

// ---------- main ----------

async function generateOGImage() {
    const html = await fs.readFile(path.join(root, 'index.html'), 'utf-8');
    const person = findPerson(html);

    // Text content. Optional <meta name="og-image:line1|line2"> tags win; JSON-LD is the fallback.
    const name = person.name || 'Joshua Cislini';
    const school = person.affiliation?.name?.split(/\s[–-]\s/)[0];
    const line1 = metaContent(html, 'og-image:line1')
        ?? [person.jobTitle, school].filter(Boolean).join(' · ');
    const line2 = metaContent(html, 'og-image:line2') ?? '';
    const siteUrl = (metaContent(html, 'og:url') ?? person.url ?? '')
        .replace(/^https?:\/\//, '').replace(/\/$/, '');

    console.log({ name, line1, line2, siteUrl });

    let svg = await fs.readFile(path.join(root, 'scripts/og-image.svg'), 'utf-8');

    // Fit each text to the space available and size the panels around it
    const rows = [
        { id: 'name', text: name, family: 'DM Serif Display', max: 960 },
        { id: 'line1', text: line1, family: 'Inter', max: 960 },
        { id: 'line2', text: line2, family: 'Inter', max: 960 },
        { id: 'url', text: siteUrl, family: 'Inter', max: 460 },
    ];
    const right = {};
    for (const r of rows) {
        const base = parseFloat(getAttr(svg, r.id, 'font-size'));
        const x = parseFloat(getAttr(svg, r.id, 'x'));
        const { size, width } = fit(r.text, r.family, base, r.max);
        svg = setAttr(svg, r.id, 'font-size', size);
        right[r.id] = x + width;
    }
    const mainRight = Math.max(right.name, right.line1, right.line2);
    const panelX = parseFloat(getAttr(svg, 'panel-main', 'x'));
    svg = setAttr(svg, 'panel-main', 'width', Math.round(mainRight + 44 - panelX));
    svg = setAttr(svg, 'panel-url', 'width', Math.round(right.url + 39 - panelX));

    // Fill placeholders (function replacers so "$" in text is never treated as a pattern)
    const values = { NAME: name, LINE1: line1, LINE2: line2, URL: siteUrl };
    for (const [key, value] of Object.entries(values)) {
        svg = svg.replaceAll(`{{${key}}}`, () => escapeXml(value));
    }
    const leftover = svg.match(/\{\{[A-Z0-9_]+\}\}/g);
    if (leftover) throw new Error(`Unfilled placeholders in template: ${[...new Set(leftover)].join(', ')}`);

    const png = new Resvg(svg, {
        font: fontOpts,
        fitTo: { mode: 'width', value: 1200 },
    }).render().asPng();

    await fs.writeFile(path.join(root, 'og-image.png'), png);
    console.log('og-image.png written.');
}

generateOGImage().catch((err) => {
    console.error('Error generating OG image:', err);
    process.exit(1);
});
