import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generateOGImage() {
    console.log("Reading index.html to extract information...");

    // 1. Read index.html and extract name and role directly from metadata/JSON-LD
    const html = await fs.readFile(path.join(__dirname, '../index.html'), 'utf-8');
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);

    let name = "Joshua Cislini";
    let title = "Electrical Engineering Student";

    if (jsonLdMatch) {
        try {
            const siteData = JSON.parse(jsonLdMatch[1]);
            if (siteData.mainEntity) {
                name = siteData.mainEntity.name || name;
                title = siteData.mainEntity.jobTitle || title;
            }
        } catch (e) {
            console.warn("Failed to parse JSON-LD, using default values.");
        }
    }

    // 2. Read the SVG template
    console.log("Loading SVG template...");
    let svgTemplate = await fs.readFile(path.join(__dirname, 'og-image.svg'), 'utf-8');

    // 3. Replace placeholders in the template with actual data
    // Make sure your og-image.svg file has {{NAME}}, {{TITLE}} or similar tags, 
    // or we inject them dynamically into the main text block.
    svgTemplate = svgTemplate
        .replace(/\{\{NAME\}\}/g, name)
        .replace(/\{\{TITLE\}\}/g, title)
        .replace(/\{\{URL\}\}/g, "joshua-cislini.github.io");

    // If the SVG template doesn't have text placeholders yet, 
    // we can add a text block in code before the closing </svg>:
    if (!svgTemplate.includes(name)) {
        const textOverlay = `
            <g transform="translate(120, 220)">
                <!-- Semi-transparent glassmorphism panel -->
                <rect x="-30" y="-30" width="950" height="260" rx="16" fill="rgba(18, 26, 21, 0.75)" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1" />
                
                <!-- Label / Category -->
                <text x="0" y="25" font-family="Inter" font-size="20" font-weight="700" fill="#34d399" letter-spacing="2">RESUME &amp; PORTFOLIO</text>
                
                <!-- Main Name -->
                <text x="0" y="105" font-family="DM Serif Display" font-size="72" fill="#ffffff">${name}</text>
                
                <!-- Subtitle / Role -->
                <text x="0" y="165" font-family="Inter" font-size="28" fill="#94a3b8">${title}</text>
                
                <!-- Web Domain -->
                <text x="0" y="210" font-family="Inter" font-size="18" fill="#64748b">joshua-cislini.github.io</text>
            </g>
        `;
        svgTemplate = svgTemplate.replace('</svg>', `${textOverlay}</svg>`);
    }

    console.log("Rendering PNG image via resvg...");

    // 4. Configure local fonts in TTF format
    const opts = {
        font: {
            fontFiles: [
                path.join(__dirname, '../fonts/Inter.ttf'),
                path.join(__dirname, '../fonts/DMSerifDisplay.ttf')
            ],
            loadSystemFonts: false,
            defaultFontFamily: 'Inter'
        },
        fitTo: {
            mode: 'width',
            value: 1200
        }
    };

    const resvg = new Resvg(svgTemplate, opts);
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    // 5. Save the final image to the site root as og-image.png
    await fs.writeFile(path.join(__dirname, '../og-image.png'), pngBuffer);
    console.log("og-image.png generated and updated successfully!");
}

generateOGImage().catch(err => {
    console.error("Error generating OG image:", err);
    process.exit(1);
});