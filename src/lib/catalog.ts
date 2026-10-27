import { BRANDS, brandById, brandForHost, type Brand } from './brands';
import type { Category } from './types';

export interface CatalogItem {
  brand: string;
  name: string;
  /** Reference / style number. */
  ref?: string;
  /** Approximate US retail, USD. */
  price: number;
  category?: Category;
  tags?: string;
}

/** Approximate US boutique retail prices. They move often, so the user can always edit. */
export const CATALOG: CatalogItem[] = [
  // Rolex
  { brand: 'rolex', name: 'Submariner', ref: '124060', price: 9750, tags: 'no date sub' },
  { brand: 'rolex', name: 'Submariner Date', ref: '126610LN', price: 10800, tags: 'sub black' },
  { brand: 'rolex', name: 'Submariner Date "Starbucks"', ref: '126610LV', price: 11250, tags: 'kermit green sub' },
  { brand: 'rolex', name: 'GMT-Master II "Pepsi"', ref: '126710BLRO', price: 11250, tags: 'gmt jubilee' },
  { brand: 'rolex', name: 'GMT-Master II "Batman"', ref: '126710BLNR', price: 11050, tags: 'gmt batgirl' },
  { brand: 'rolex', name: 'GMT-Master II "Sprite"', ref: '126720VTNR', price: 11250, tags: 'gmt lefty destro' },
  { brand: 'rolex', name: 'Cosmograph Daytona', ref: '126500LN', price: 16100, tags: 'daytona panda white' },
  { brand: 'rolex', name: 'Cosmograph Daytona Yellow Gold', ref: '126508', price: 50900, tags: 'daytona gold' },
  { brand: 'rolex', name: 'Datejust 41', ref: '126334', price: 11000, tags: 'datejust fluted wimbledon' },
  { brand: 'rolex', name: 'Datejust 36', ref: '126234', price: 9500, tags: 'datejust' },
  { brand: 'rolex', name: 'Day-Date 40 Yellow Gold', ref: '228238', price: 40500, tags: 'president day date' },
  { brand: 'rolex', name: 'Day-Date 40 Platinum Ice Blue', ref: '228206', price: 66000, tags: 'president day date platinum' },
  { brand: 'rolex', name: 'Explorer 40', ref: '224270', price: 7800, tags: 'explorer' },
  { brand: 'rolex', name: 'Sky-Dweller', ref: '336934', price: 16900, tags: 'skydweller' },
  { brand: 'rolex', name: 'Yacht-Master 40', ref: '126622', price: 13300, tags: 'yachtmaster rolesium' },
  { brand: 'rolex', name: 'Oyster Perpetual 41', ref: '124300', price: 6800, tags: 'op tiffany blue' },
  // Audemars Piguet
  { brand: 'ap', name: 'Royal Oak Selfwinding 41mm', ref: '15510ST', price: 31900, tags: 'royal oak ro' },
  { brand: 'ap', name: 'Royal Oak Chronograph 41mm', ref: '26240ST', price: 41500, tags: 'royal oak chrono' },
  { brand: 'ap', name: 'Royal Oak Offshore Chronograph', ref: '26420SO', price: 33800, tags: 'offshore roo' },
  // Patek
  { brand: 'patek', name: 'Nautilus', ref: '5811/1G', price: 69700, tags: 'nautilus' },
  { brand: 'patek', name: 'Aquanaut', ref: '5168G', price: 47000, tags: 'aquanaut' },
  { brand: 'patek', name: 'Calatrava', ref: '6119G', price: 31600, tags: 'calatrava dress' },
  // Omega
  { brand: 'omega', name: 'Speedmaster Moonwatch Professional', ref: '310.30.42.50.01.001', price: 7600, tags: 'speedy moonwatch' },
  { brand: 'omega', name: 'Seamaster Diver 300M', ref: '210.30.42.20.03.001', price: 6000, tags: 'seamaster bond' },
  { brand: 'omega', name: 'Seamaster Aqua Terra 41mm', ref: '220.10.41.21.03.004', price: 6700, tags: 'aqua terra' },
  // Cartier
  { brand: 'cartier', name: 'Love Bracelet, Yellow Gold', ref: 'B6067517', price: 7350, tags: 'love bangle' },
  { brand: 'cartier', name: 'Love Bracelet, 4 Diamonds', ref: 'B6070417', price: 10900, tags: 'love bangle diamonds' },
  { brand: 'cartier', name: 'Love Ring, Yellow Gold', ref: 'B4084800', price: 2010, tags: 'love ring' },
  { brand: 'cartier', name: 'Juste un Clou Bracelet', ref: 'B6048217', price: 7350, tags: 'nail bracelet clou' },
  { brand: 'cartier', name: 'Santos de Cartier Large', ref: 'WSSA0018', price: 8150, tags: 'santos watch' },
  { brand: 'cartier', name: 'Tank Must Large', ref: 'WSTA0041', price: 3300, tags: 'tank watch' },
  { brand: 'cartier', name: 'Panthère de Cartier Small', ref: 'WSPN0007', price: 5350, tags: 'panthere watch' },
  { brand: 'cartier', name: 'Clash de Cartier Bracelet', ref: 'N6716617', price: 7100, tags: 'clash' },
  // Van Cleef
  { brand: 'vca', name: 'Vintage Alhambra Necklace, 10 Motifs', ref: 'VCARA42800', price: 13300, tags: 'alhambra clover onyx' },
  { brand: 'vca', name: 'Vintage Alhambra Pendant', ref: 'VCARA45900', price: 3600, tags: 'alhambra clover' },
  { brand: 'vca', name: 'Vintage Alhambra Bracelet, 5 Motifs', ref: 'VCARF48800', price: 6100, tags: 'alhambra clover bracelet' },
  { brand: 'vca', name: 'Sweet Alhambra Bracelet', ref: 'VCARF68800', price: 1750, tags: 'alhambra clover' },
  { brand: 'vca', name: 'Perlée Clovers Bracelet', ref: 'VCARP24400', price: 9600, tags: 'perlee' },
  // Tiffany
  { brand: 'tiffany', name: 'Tiffany HardWear Link Bracelet', ref: '63052648', price: 3600, tags: 'hardwear' },
  { brand: 'tiffany', name: 'Tiffany T1 Wide Hinged Bangle', ref: '63551826', price: 11100, tags: 't1' },
  { brand: 'tiffany', name: 'Tiffany Lock Bangle', ref: '70171577', price: 8000, tags: 'lock' },
  { brand: 'tiffany', name: 'Return to Tiffany Heart Tag Bracelet', ref: '22994463', price: 400, tags: 'heart tag' },
  // Louis Vuitton
  { brand: 'lv', name: 'Speedy Bandoulière 25 Monogram', ref: 'M46222', price: 2250, tags: 'speedy' },
  { brand: 'lv', name: 'Neverfull MM Monogram', ref: 'M41177', price: 2170, tags: 'neverfull tote' },
  { brand: 'lv', name: 'Keepall Bandoulière 50 Monogram', ref: 'M41416', price: 3050, tags: 'keepall duffle' },
  { brand: 'lv', name: 'OnTheGo MM Monogram', ref: 'M45321', price: 3750, tags: 'onthego tote' },
  { brand: 'lv', name: 'Pochette Métis East West', ref: 'M46279', price: 3350, tags: 'metis' },
  { brand: 'lv', name: 'Alma BB Monogram', ref: 'M53152', price: 2170, tags: 'alma' },
  { brand: 'lv', name: 'Capucines MM', ref: 'M48864', price: 7400, tags: 'capucines' },
  { brand: 'lv', name: 'Christopher Backpack MM', ref: 'M46336', price: 4600, tags: 'backpack' },
  { brand: 'lv', name: 'LV Trainer Sneaker', ref: '1AARUA', price: 1370, category: 'sneakers', tags: 'trainer shoes' },
  { brand: 'lv', name: 'LV Skate Sneaker', ref: '1ABZ0D', price: 1390, category: 'sneakers', tags: 'skate shoes' },
  { brand: 'lv', name: 'Pocket Organizer Monogram Eclipse', ref: 'M61696', price: 460, tags: 'wallet card holder' },
  { brand: 'lv', name: 'Multiple Wallet Monogram', ref: 'M60895', price: 660, tags: 'wallet' },
  // Hermès
  { brand: 'hermes', name: 'Birkin 25 Togo', price: 12600, tags: 'birkin' },
  { brand: 'hermes', name: 'Birkin 30 Togo', price: 13400, tags: 'birkin' },
  { brand: 'hermes', name: 'Kelly 28 Sellier Epsom', price: 12900, tags: 'kelly' },
  { brand: 'hermes', name: 'Constance 18', price: 10400, tags: 'constance' },
  { brand: 'hermes', name: 'Evelyne PM', price: 3650, tags: 'evelyne' },
  { brand: 'hermes', name: 'Picotin Lock 18', price: 3500, tags: 'picotin' },
  { brand: 'hermes', name: 'Clic H Bracelet', price: 870, category: 'jewelry', tags: 'clic clac' },
  { brand: 'hermes', name: 'Oran Sandal', price: 800, tags: 'oran slides' },
  // Chanel
  { brand: 'chanel', name: 'Classic 11.12 Handbag, Medium', ref: 'A01112', price: 11700, tags: 'classic flap cf' },
  { brand: 'chanel', name: 'Classic Handbag, Small', ref: 'A01113', price: 11100, tags: 'classic flap cf' },
  { brand: 'chanel', name: 'Classic Handbag, Jumbo', ref: 'A58600', price: 12600, tags: 'classic flap jumbo' },
  { brand: 'chanel', name: 'Chanel 22 Handbag, Small', ref: 'AS3260', price: 7500, tags: '22 bag' },
  { brand: 'chanel', name: 'Boy Chanel Handbag', ref: 'A67086', price: 7600, tags: 'boy bag' },
  { brand: 'chanel', name: 'Wallet on Chain', ref: 'AP0250', price: 4100, tags: 'woc' },
  // Gucci
  { brand: 'gucci', name: 'GG Marmont Small Shoulder Bag', ref: '443497', price: 2890, tags: 'marmont' },
  { brand: 'gucci', name: 'Jackie 1961 Small Shoulder Bag', ref: '636709', price: 3500, tags: 'jackie' },
  { brand: 'gucci', name: 'Horsebit 1955 Shoulder Bag', ref: '602204', price: 3200, tags: 'horsebit' },
  { brand: 'gucci', name: 'Ophidia GG Medium Tote', ref: '631685', price: 2400, tags: 'ophidia' },
  { brand: 'gucci', name: 'Ace Sneaker', ref: '386750', price: 850, category: 'sneakers', tags: 'ace shoes' },
  { brand: 'gucci', name: 'Horsebit Loafer', ref: '307929', price: 1050, tags: 'loafer shoes' },
  { brand: 'gucci', name: 'GG Belt with Double G Buckle', ref: '414516', price: 550, tags: 'belt' },
  // Dior
  { brand: 'dior', name: 'Lady Dior Medium', ref: 'M0565ONGE', price: 6900, tags: 'lady dior' },
  { brand: 'dior', name: 'Saddle Bag', ref: 'M0446CTZQ', price: 4600, tags: 'saddle' },
  { brand: 'dior', name: 'Book Tote Medium', ref: 'M1296ZRIW', price: 3900, tags: 'book tote' },
  { brand: 'dior', name: 'B23 High-Top Sneaker', ref: '3SH118YJP', price: 1250, category: 'sneakers', tags: 'b23 shoes' },
  { brand: 'dior', name: 'B30 Sneaker', ref: '3SN279ZIJ', price: 1250, category: 'sneakers', tags: 'b30 shoes' },
  // Prada
  { brand: 'prada', name: 'Re-Edition 2005 Re-Nylon Bag', ref: '1BH204', price: 1950, tags: 'nylon re-edition' },
  { brand: 'prada', name: 'Galleria Saffiano Medium Bag', ref: '1BA863', price: 4500, tags: 'galleria' },
  { brand: 'prada', name: 'Monolith Brushed Leather Loafers', ref: '1D246M', price: 1350, tags: 'monolith loafer' },
  // Balenciaga
  { brand: 'balenciaga', name: 'Triple S Sneaker', ref: '536737', price: 1190, category: 'sneakers', tags: 'triple s shoes' },
  { brand: 'balenciaga', name: 'Track Sneaker', ref: '542023', price: 1190, category: 'sneakers', tags: 'track shoes' },
  { brand: 'balenciaga', name: 'Le Cagole Shoulder Bag', ref: '671309', price: 3100, tags: 'cagole' },
  { brand: 'balenciaga', name: 'Hourglass Small Handbag', ref: '592833', price: 3200, tags: 'hourglass' },
  // Bottega
  { brand: 'bottega', name: 'Jodie Mini', ref: '651876', price: 3400, tags: 'jodie' },
  { brand: 'bottega', name: 'Cassette Bag', ref: '578004', price: 3600, tags: 'cassette padded' },
  { brand: 'bottega', name: 'Andiamo Medium', ref: '743572', price: 6900, tags: 'andiamo' },
  // Saint Laurent
  { brand: 'ysl', name: 'Loulou Medium Chain Bag', ref: '574946', price: 3450, tags: 'loulou' },
  { brand: 'ysl', name: 'Kate Medium Chain Bag', ref: '364021', price: 2900, tags: 'kate' },
  { brand: 'ysl', name: 'Sac de Jour Small', ref: '378299', price: 3900, tags: 'sac de jour' },
  // Goyard
  { brand: 'goyard', name: 'Saint Louis PM Tote', price: 2150, tags: 'st louis tote' },
  { brand: 'goyard', name: 'Artois MM Tote', price: 3150, tags: 'artois tote' },
  { brand: 'goyard', name: 'Saint Sulpice Card Wallet', price: 520, tags: 'card holder wallet' },
  // Outerwear / streetwear
  { brand: 'moncler', name: 'Maya Short Down Jacket', price: 2050, tags: 'maya puffer' },
  { brand: 'moncler', name: 'Montbeliard Down Jacket', price: 1950, tags: 'puffer' },
  { brand: 'amiri', name: 'MX1 Jean', price: 1290, tags: 'jeans denim' },
  { brand: 'amiri', name: 'Skel Top Low Sneaker', price: 650, category: 'sneakers', tags: 'skel shoes' },
  { brand: 'chromehearts', name: 'Cross Pendant Necklace', price: 1450, tags: 'cross' },
  { brand: 'chromehearts', name: 'Forever Ring', price: 450, tags: 'ring' },
  // Sneakers
  { brand: 'nike', name: "Air Jordan 1 Retro High OG '85", price: 1280, category: 'sneakers', tags: 'jordan 1 aj1 resale' },
  { brand: 'nike', name: 'Air Jordan 4 Retro', price: 650, category: 'sneakers', tags: 'jordan 4 aj4 resale' },
  // Tech
  { brand: 'apple', name: 'MacBook Pro 16-inch', price: 2499, tags: 'macbook laptop' },
  { brand: 'apple', name: 'iPhone Pro Max', price: 1199, tags: 'iphone phone' },
  { brand: 'apple', name: 'Apple Vision Pro', price: 3499, tags: 'vision headset' },
  { brand: 'apple', name: 'Apple Watch Ultra', price: 799, tags: 'watch ultra' },
  { brand: 'apple', name: 'Mac Studio', price: 1999, tags: 'desktop' },
  // Home
  { brand: 'hermanmiller', name: 'Eames Lounge Chair and Ottoman', price: 8495, tags: 'eames chair' },
  // Auto
  { brand: 'porsche', name: '911 Carrera', price: 122100, tags: 'car 911' },
  { brand: 'porsche', name: '911 GT3', price: 222500, tags: 'car gt3' },
  { brand: 'mercedes', name: 'G 550 SUV', price: 148250, tags: 'g wagon g-class car' },
  { brand: 'mercedes', name: 'AMG G 63', price: 186350, tags: 'g wagon g63 car' },
  { brand: 'lamborghini', name: 'Urus SE', price: 258000, tags: 'urus car suv' },
  { brand: 'rangerover', name: 'Range Rover SE', price: 108000, tags: 'car suv' },
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const compact = (s: string) => norm(s).replace(/ /g, '');

const haystack = (i: CatalogItem) => {
  const b = brandById(i.brand)!;
  return norm(`${b.name} ${b.aliases?.join(' ') ?? ''} ${i.name} ${i.ref ?? ''} ${i.tags ?? ''}`);
};

export interface CatalogHit {
  item: CatalogItem;
  brand: Brand;
  score: number;
}

export function searchCatalog(query: string, limit = 8): CatalogHit[] {
  const q = norm(query);
  if (!q) return [];
  const words = q.split(' ');
  const qc = compact(query);
  const hits: CatalogHit[] = [];
  for (const item of CATALOG) {
    const hay = haystack(item);
    if (!words.every((w) => hay.includes(w))) {
      // Allow a bare reference number like "126610ln" or "m46222".
      if (!(item.ref && qc.length >= 4 && compact(item.ref).includes(qc))) continue;
    }
    const brand = brandById(item.brand)!;
    let score = 0;
    if (item.ref && compact(item.ref) === qc) score += 100;
    if (norm(item.name).startsWith(q)) score += 20;
    if (norm(brand.name).startsWith(words[0]) || brand.aliases?.includes(words[0])) score += 10;
    // Whole-word hits beat substring hits ("4" in "jordan 4" vs. inside a style code).
    const tokens = new Set(hay.split(' '));
    score += words.filter((w) => tokens.has(w)).length * 3;
    // Among equals, list the bigger-ticket pieces first.
    score += Math.log10(item.price) * 0.5;
    hits.push({ item, brand, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

export const brandsMatching = (query: string) => {
  const q = norm(query);
  if (!q) return [];
  return BRANDS.filter((b) => norm(b.name).startsWith(q) || b.aliases?.some((a) => a.startsWith(q)));
};

export interface LinkImport {
  url: string;
  host: string;
  brand?: Brand;
  /** Set when the link is from a reseller/department store (e.g. StockX). */
  store?: Brand;
  /** Product name guessed from the URL slug. */
  name?: string;
  match?: CatalogHit;
}

const STOP = new Set(['products', 'product', 'p', 'pr', 'us', 'en', 'eng', 'en-us', 'eng-us', 'shop', 'item', 'women', 'men', 'watches', 'collections', 'html', 'www']);

const titleCase = (s: string) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());

/**
 * Reads what it can from a product URL alone — store, product slug and any reference number —
 * then matches it against the catalog. Nothing is fetched.
 */
export function parseProductLink(raw: string): LinkImport | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    return null;
  }
  if (!url.hostname.includes('.')) return null;
  const brand = brandForHost(url.hostname);
  const segments = decodeURIComponent(url.pathname)
    .split('/')
    .map((s) => s.replace(/\.(html?|aspx|php)$/i, ''))
    .filter((s) => s && !STOP.has(s.toLowerCase()));

  // Reference-like tokens: contain digits, 4+ chars (e.g. m126610ln-0001, M46222, 443497).
  const tokens = segments.flatMap((s) => s.split(/[-_~.]/)).filter((t) => /\d/.test(t) && t.length >= 4);
  let match: CatalogHit | undefined;
  for (const t of tokens) {
    const ref = t.replace(/^m(?=\d{6})/i, ''); // Rolex URLs prefix refs with "m"
    const hit = searchCatalog(ref, 1)[0];
    if (hit && hit.item.ref && compact(hit.item.ref).includes(compact(ref))) {
      match = hit;
      break;
    }
  }

  // The longest wordy segment is usually the product slug.
  const slug = segments
    .filter((s) => /[a-z]/i.test(s) && s.includes('-'))
    .sort((a, b) => b.length - a.length)[0];
  let name: string | undefined;
  if (slug) {
    const words = slug
      .split(/[-_]+/)
      .filter((w) => w && !/^(nvprod|prod)\d+/i.test(w) && !/^[a-z]?\d{5,}/i.test(w) && !/^\d{3}$/.test(w));
    if (words.length) name = titleCase(words.join(' ').toLowerCase());
  }

  if (!match && name) {
    const hit = searchCatalog(`${brand ? brand.name + ' ' : ''}${name}`, 1)[0] ?? searchCatalog(name, 1)[0];
    // Accept collabs too, e.g. a nike.com link to a collab sneaker filed under another brand.
    if (hit && (!brand || brand.retailer || hit.brand.id === brand.id || haystack(hit.item).includes(norm(brand.name)))) match = hit;
  }

  return {
    url: url.href,
    host: url.hostname.replace(/^www\./, ''),
    brand: match?.brand ?? brand,
    store: brand?.retailer ? brand : undefined,
    name,
    match,
  };
}
