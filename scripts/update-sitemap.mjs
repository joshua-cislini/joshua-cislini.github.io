import fs from 'fs';
import path from 'path';

const sitemapPath = path.resolve('sitemap.xml');

if (fs.existsSync(sitemapPath)) {
    let content = fs.readFileSync(sitemapPath, 'utf-8');
    const today = new Date().toISOString().split('T')[0];

    // Replace existing <lastmod> dates with today's date
    content = content.replace(/<lastmod>.*?<\/lastmod>/g, `<lastmod>${today}</lastmod>`);

    fs.writeFileSync(sitemapPath, content, 'utf-8');
    console.log(`Updated sitemap.xml lastmod dates to ${today}`);
} else {
    console.warn('sitemap.xml not found. Skipping update.');
}