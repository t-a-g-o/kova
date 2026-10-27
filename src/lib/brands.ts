import type { Category } from './types';

export interface Brand {
  id: string;
  name: string;
  domain: string;
  /** Tile background when showing the brand mark. */
  color: string;
  category: Category;
  /** Shown as the merchant on plans. */
  store?: string;
  aliases?: string[];
  /** Multi-brand store or resale marketplace rather than a maker. */
  retailer?: boolean;
}

export const logoUrl = (domain: string, size = 128) => `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;

export const BRANDS: Brand[] = [
  { id: 'rolex', name: 'Rolex', domain: 'rolex.com', color: '#0e3b2a', category: 'watches', store: 'Rolex Boutique' },
  { id: 'ap', name: 'Audemars Piguet', domain: 'audemarspiguet.com', color: '#111111', category: 'watches', aliases: ['ap', 'audemars'] },
  { id: 'patek', name: 'Patek Philippe', domain: 'patek.com', color: '#13233f', category: 'watches', aliases: ['patek'] },
  { id: 'omega', name: 'Omega', domain: 'omegawatches.com', color: '#8b0f1c', category: 'watches' },
  { id: 'cartier', name: 'Cartier', domain: 'cartier.com', color: '#8c1c22', category: 'jewelry' },
  { id: 'vca', name: 'Van Cleef & Arpels', domain: 'vancleefarpels.com', color: '#0f3d33', category: 'jewelry', aliases: ['vca', 'van cleef'] },
  { id: 'tiffany', name: 'Tiffany & Co.', domain: 'tiffany.com', color: '#81d8d0', category: 'jewelry', aliases: ['tiffany'] },
  { id: 'lv', name: 'Louis Vuitton', domain: 'louisvuitton.com', color: '#3a2a1c', category: 'fashion', aliases: ['lv', 'vuitton'] },
  { id: 'hermes', name: 'Hermès', domain: 'hermes.com', color: '#f37021', category: 'fashion', aliases: ['hermes'] },
  { id: 'chanel', name: 'Chanel', domain: 'chanel.com', color: '#0a0a0a', category: 'fashion' },
  { id: 'gucci', name: 'Gucci', domain: 'gucci.com', color: '#0d3b2e', category: 'fashion' },
  { id: 'dior', name: 'Dior', domain: 'dior.com', color: '#1b1b1b', category: 'fashion', aliases: ['christian dior'] },
  { id: 'prada', name: 'Prada', domain: 'prada.com', color: '#111111', category: 'fashion' },
  { id: 'balenciaga', name: 'Balenciaga', domain: 'balenciaga.com', color: '#000000', category: 'fashion' },
  { id: 'bottega', name: 'Bottega Veneta', domain: 'bottegaveneta.com', color: '#2f5d2b', category: 'fashion', aliases: ['bottega', 'bv'] },
  { id: 'ysl', name: 'Saint Laurent', domain: 'ysl.com', color: '#000000', category: 'fashion', aliases: ['ysl', 'yves saint laurent'] },
  { id: 'goyard', name: 'Goyard', domain: 'goyard.com', color: '#2b2b2b', category: 'fashion' },
  { id: 'moncler', name: 'Moncler', domain: 'moncler.com', color: '#0b1f4b', category: 'fashion' },
  { id: 'amiri', name: 'Amiri', domain: 'amiri.com', color: '#141414', category: 'fashion' },
  { id: 'chromehearts', name: 'Chrome Hearts', domain: 'chromehearts.com', color: '#111111', category: 'jewelry' },
  { id: 'nike', name: 'Nike', domain: 'nike.com', color: '#111111', category: 'sneakers', aliases: ['jordan'] },
  { id: 'apple', name: 'Apple', domain: 'apple.com', color: '#f5f5f7', category: 'tech' },
  { id: 'porsche', name: 'Porsche', domain: 'porsche.com', color: '#1a1a1a', category: 'auto' },
  { id: 'mercedes', name: 'Mercedes-Benz', domain: 'mbusa.com', color: '#0f0f0f', category: 'auto', aliases: ['mercedes', 'benz', 'amg'] },
  { id: 'lamborghini', name: 'Lamborghini', domain: 'lamborghini.com', color: '#111111', category: 'auto', aliases: ['lambo'] },
  { id: 'rangerover', name: 'Range Rover', domain: 'rangerover.com', color: '#1c2a24', category: 'auto' },
  { id: 'hermanmiller', name: 'Herman Miller', domain: 'hermanmiller.com', color: '#c8102e', category: 'home' },
  { id: 'ssense', name: 'SSENSE', domain: 'ssense.com', color: '#000000', category: 'fashion' , retailer: true },
  { id: 'farfetch', name: 'FARFETCH', domain: 'farfetch.com', color: '#000000', category: 'fashion' , retailer: true },
  { id: 'mytheresa', name: 'Mytheresa', domain: 'mytheresa.com', color: '#000000', category: 'fashion' , retailer: true },
  { id: 'neiman', name: 'Neiman Marcus', domain: 'neimanmarcus.com', color: '#000000', category: 'fashion' , retailer: true },
  { id: 'saks', name: 'Saks Fifth Avenue', domain: 'saksfifthavenue.com', color: '#000000', category: 'fashion', aliases: ['saks'] , retailer: true },
  { id: 'nordstrom', name: 'Nordstrom', domain: 'nordstrom.com', color: '#000000', category: 'fashion' , retailer: true },
  { id: 'stockx', name: 'StockX', domain: 'stockx.com', color: '#006340', category: 'sneakers' , retailer: true },
  { id: 'goat', name: 'GOAT', domain: 'goat.com', color: '#000000', category: 'sneakers' , retailer: true },
  { id: 'chrono24', name: 'Chrono24', domain: 'chrono24.com', color: '#0b2341', category: 'watches' , retailer: true },
  { id: 'therealreal', name: 'The RealReal', domain: 'therealreal.com', color: '#000000', category: 'fashion' , retailer: true },
];

export const brandById = (id?: string) => BRANDS.find((b) => b.id === id);

/** Matches a hostname like "us.louisvuitton.com" to a brand. */
export const brandForHost = (host: string) => {
  const h = host.toLowerCase().replace(/^www\./, '');
  return BRANDS.find((b) => h === b.domain || h.endsWith('.' + b.domain) || h.split('.').includes(b.domain.split('.')[0]));
};

export const brandForName = (name: string) => {
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  return BRANDS.find((b) => b.name.toLowerCase() === n || b.aliases?.includes(n));
};

/* ---------- Banks & card issuers ---------- */

export interface Bank {
  name: string;
  domain: string;
  color: string;
  /** Default card finish when this bank issues a card. */
  cardTheme?: string;
  issuer?: boolean;
}

export const BANKS: Bank[] = [
  { name: 'Chase', domain: 'chase.com', color: '#117aca', cardTheme: 'sapphire', issuer: true },
  { name: 'Bank of America', domain: 'bankofamerica.com', color: '#e31837', cardTheme: 'crimson', issuer: true },
  { name: 'Wells Fargo', domain: 'wellsfargo.com', color: '#d71e28', cardTheme: 'crimson', issuer: true },
  { name: 'Capital One', domain: 'capitalone.com', color: '#004977', cardTheme: 'metal', issuer: true },
  { name: 'Citi', domain: 'citi.com', color: '#056dae', cardTheme: 'platinum', issuer: true },
  { name: 'American Express', domain: 'americanexpress.com', color: '#006fcf', cardTheme: 'platinum', issuer: true },
  { name: 'Apple Card', domain: 'apple.com', color: '#e8e8ed', cardTheme: 'titanium', issuer: true },
  { name: 'Discover', domain: 'discover.com', color: '#ff6000', cardTheme: 'carbon', issuer: true },
  { name: 'US Bank', domain: 'usbank.com', color: '#0c2074', cardTheme: 'midnight', issuer: true },
  { name: 'Navy Federal', domain: 'navyfederal.org', color: '#0b2d71', cardTheme: 'midnight', issuer: true },
  { name: 'Travis Credit Union', domain: 'traviscu.org', color: '#00467f', cardTheme: 'sapphire', issuer: true },
  { name: 'USAA', domain: 'usaa.com', color: '#12395b', cardTheme: 'midnight', issuer: true },
  { name: 'Chime', domain: 'chime.com', color: '#1ec677', cardTheme: 'emerald', issuer: true },
  { name: 'SoFi', domain: 'sofi.com', color: '#00a2c7', cardTheme: 'metal', issuer: true },
  { name: 'Ally', domain: 'ally.com', color: '#650360' },
  { name: 'PNC', domain: 'pnc.com', color: '#ef6a00', issuer: true },
  { name: 'TD Bank', domain: 'td.com', color: '#34a853', issuer: true },
  { name: 'Truist', domain: 'truist.com', color: '#2e1a47', issuer: true },
  { name: 'Charles Schwab', domain: 'schwab.com', color: '#00a0df' },
  { name: 'Fidelity', domain: 'fidelity.com', color: '#368727' },
  { name: 'Goldman Sachs', domain: 'goldmansachs.com', color: '#7399c6' },
  { name: 'Citizens', domain: 'citizensbank.com', color: '#008555' },
  { name: 'Huntington', domain: 'huntington.com', color: '#5ab031' },
  { name: 'Cash App', domain: 'cash.app', color: '#00d632', cardTheme: 'holo', issuer: true },
  { name: 'Robinhood', domain: 'robinhood.com', color: '#ccff00', cardTheme: 'gold', issuer: true },
  { name: 'Revolut', domain: 'revolut.com', color: '#191c1f', cardTheme: 'holo', issuer: true },
  { name: 'Varo', domain: 'varomoney.com', color: '#3f2fc4' },
  { name: 'Marcus', domain: 'marcus.com', color: '#0b2341' },
];

export const bankByName = (name?: string) => (name ? BANKS.find((b) => b.name.toLowerCase() === name.trim().toLowerCase()) : undefined);
