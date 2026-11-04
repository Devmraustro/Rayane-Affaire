/**
 * Generates the neutral SVG placeholders used for demonstration listings and as
 * the global fallback when a listing has no photograph yet.
 *
 * They are deliberately NOT photographs: the requirement forbids presenting
 * stock or generated imagery as a specific client property. Each artwork is
 * abstract, brand-coloured and labelled "démonstration" in both languages.
 *
 * Run: npm run assets:placeholders
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'public', 'images', 'fallback');

interface Variant {
  file: string;
  labelFr: string;
  labelAr: string;
  tone: 'sand' | 'ink' | 'gold' | 'clay' | 'sea' | 'stone';
  glyph: 'building' | 'house' | 'car' | 'suv' | 'villa' | 'land';
}

const TONES: Record<Variant['tone'], { bg1: string; bg2: string; line: string; accent: string }> = {
  sand: { bg1: '#FAF9F7', bg2: '#EFEAE0', line: '#D8D3C8', accent: '#D9A622' },
  ink: { bg1: '#25252A', bg2: '#16161A', line: '#3A3A42', accent: '#D9A622' },
  gold: { bg1: '#FBF7EA', bg2: '#F1E4BD', line: '#E1CE93', accent: '#B98417' },
  clay: { bg1: '#F7F1EC', bg2: '#EBDFD4', line: '#DCC9B8', accent: '#B0733F' },
  sea: { bg1: '#F1F6F7', bg2: '#DDEAEC', line: '#C3D9DC', accent: '#2F6F7A' },
  stone: { bg1: '#F4F4F5', bg2: '#E4E4E7', line: '#D0D0D5', accent: '#6B6B72' },
};

/** Simple, tasteful line-art glyphs (no photorealism intended). */
function glyphPath(glyph: Variant['glyph'], accent: string, line: string): string {
  switch (glyph) {
    case 'building':
      return `<g fill="none" stroke="${line}" stroke-width="3" stroke-linejoin="round">
        <rect x="330" y="230" width="180" height="270" rx="6"/>
        <rect x="510" y="300" width="150" height="200" rx="6"/>
        <path d="M360 280h30M420 280h30M480 280h0M360 330h30M420 330h30M360 380h30M420 380h30M360 430h30M420 430h30" stroke="${line}"/>
        <path d="M540 340h30M600 340h30M540 390h30M600 390h30M540 440h30M600 440h30"/>
        <path d="M410 500v-46a22 22 0 0 1 44 0v46" stroke="${accent}"/>
      </g>`;
    case 'house':
    case 'villa':
      return `<g fill="none" stroke="${line}" stroke-width="3" stroke-linejoin="round">
        <path d="M320 420l190-140 190 140" stroke="${accent}"/>
        <path d="M356 420v110h308V420"/>
        <rect x="470" y="450" width="70" height="80" rx="4"/>
        <path d="M400 450h40v50h-40zM562 450h40v50h-40z"/>
      </g>`;
    case 'car':
      return `<g fill="none" stroke="${line}" stroke-width="3" stroke-linejoin="round">
        <path d="M300 400h360l-26-56a34 34 0 0 0-30-19H356a34 34 0 0 0-30 19z" stroke="${accent}"/>
        <path d="M300 400v34h360v-34"/>
        <circle cx="380" cy="438" r="26"/><circle cx="580" cy="438" r="26"/>
        <path d="M362 325h116v56H338zM502 325h96l22 56H502z"/>
      </g>`;
    case 'suv':
      return `<g fill="none" stroke="${line}" stroke-width="3" stroke-linejoin="round">
        <path d="M286 392h388l-22-64a38 38 0 0 0-34-24H382a38 38 0 0 0-34 24z" stroke="${accent}"/>
        <path d="M286 392v40h388v-40"/>
        <circle cx="366" cy="438" r="30"/><circle cx="592" cy="438" r="30"/>
        <path d="M368 304h104v58H344zM506 304h84l28 58H506z"/>
      </g>`;
    case 'land':
      return `<g fill="none" stroke="${line}" stroke-width="3" stroke-linejoin="round">
        <path d="M270 430c60-40 130-40 190-8s140 28 190-6" stroke="${accent}"/>
        <path d="M270 470c60-40 130-40 190-8s140 28 190-6"/>
        <path d="M300 430v-90M300 340l40 22-40 22M560 424v-110M560 314l40 22-40 22"/>
        <circle cx="470" cy="330" r="34"/>
      </g>`;
    default:
      return '';
  }
}

function svg(v: Variant): string {
  const t = TONES[v.tone];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640" width="960" height="640" role="img" aria-label="${v.labelFr}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t.bg1}"/>
      <stop offset="1" stop-color="${t.bg2}"/>
    </linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0v48" fill="none" stroke="${t.line}" stroke-opacity="0.5" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="960" height="640" fill="url(#bg)"/>
  <rect width="960" height="640" fill="url(#grid)" opacity="0.55"/>
  <circle cx="850" cy="90" r="150" fill="${t.accent}" opacity="0.07"/>
  ${glyphPath(v.glyph, t.accent, t.line)}
  <g font-family="Georgia, 'Times New Roman', serif" fill="${v.tone === 'ink' ? '#E9E9EA' : '#35353B'}">
    <text x="60" y="566" font-size="26" letter-spacing="6" opacity="0.85">RAYANE AFFAIRE</text>
    <text x="60" y="604" font-size="17" letter-spacing="2" opacity="0.6">${v.labelFr} · ${v.labelAr}</text>
  </g>
  <rect x="60" y="60" width="4" height="52" fill="${t.accent}"/>
</svg>
`;
}

const VARIANTS: Variant[] = [
  { file: 'hero.svg', labelFr: 'Visuel de démonstration', labelAr: 'صورة توضيحية', tone: 'ink', glyph: 'villa' },
  { file: 'property-1.svg', labelFr: 'Visuel de démonstration', labelAr: 'صورة توضيحية', tone: 'sand', glyph: 'building' },
  { file: 'property-2.svg', labelFr: 'Visuel de démonstration', labelAr: 'صورة توضيحية', tone: 'gold', glyph: 'villa' },
  { file: 'property-3.svg', labelFr: 'Visuel de démonstration', labelAr: 'صورة توضيحية', tone: 'clay', glyph: 'house' },
  { file: 'property-4.svg', labelFr: 'Visuel de démonstration', labelAr: 'صورة توضيحية', tone: 'sea', glyph: 'building' },
  { file: 'property-5.svg', labelFr: 'Visuel de démonstration', labelAr: 'صورة توضيحية', tone: 'stone', glyph: 'land' },
  { file: 'property-6.svg', labelFr: 'Visuel de démonstration', labelAr: 'صورة توضيحية', tone: 'sand', glyph: 'house' },
  { file: 'vehicle-1.svg', labelFr: 'Visuel de démonstration', labelAr: 'صورة توضيحية', tone: 'ink', glyph: 'car' },
  { file: 'vehicle-2.svg', labelFr: 'Visuel de démonstration', labelAr: 'صورة توضيحية', tone: 'sea', glyph: 'suv' },
  { file: 'vehicle-3.svg', labelFr: 'Visuel de démonstration', labelAr: 'صورة توضيحية', tone: 'stone', glyph: 'car' },
  { file: 'placeholder.svg', labelFr: 'Image à venir', labelAr: 'الصورة قريباً', tone: 'sand', glyph: 'building' },
];

mkdirSync(OUT, { recursive: true });
for (const v of VARIANTS) writeFileSync(join(OUT, v.file), svg(v), 'utf8');
console.log(`✔ ${VARIANTS.length} placeholder artworks written to public/images/fallback/`);
