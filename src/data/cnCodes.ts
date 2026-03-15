import { CNCodeEntry, TradeRouteInfo } from '../types/costing';

export const TRADE_ROUTES: TradeRouteInfo[] = [
  {
    id: 'china-uk',
    label: 'China → United Kingdom',
    origin: 'China',
    destination: 'United Kingdom',
    destCode: 'UK',
    defaultVAT: 20,
    defaultTransitDays: 30,
    gspEligible: false,
  },
  {
    id: 'china-eu',
    label: 'China → European Union',
    origin: 'China',
    destination: 'European Union',
    destCode: 'EU',
    defaultVAT: 20,
    defaultTransitDays: 28,
    gspEligible: false,
  },
  {
    id: 'thailand-uk',
    label: 'Thailand → United Kingdom',
    origin: 'Thailand',
    destination: 'United Kingdom',
    destCode: 'UK',
    defaultVAT: 20,
    defaultTransitDays: 25,
    gspEligible: true,
  },
  {
    id: 'thailand-eu',
    label: 'Thailand → European Union',
    origin: 'Thailand',
    destination: 'European Union',
    destCode: 'EU',
    defaultVAT: 20,
    defaultTransitDays: 23,
    gspEligible: true,
  },
];

export const CN_CODE_DATABASE: CNCodeEntry[] = [
  { code: '84713000', description: 'Laptops / Portable computers', ukDutyRate: 0, euDutyRate: 0, requiresLicence: false, antiDumpingChina: false },
  { code: '84716000', description: 'Computer keyboards & input devices', ukDutyRate: 0, euDutyRate: 0, requiresLicence: false, antiDumpingChina: false },
  { code: '85171300', description: 'Smartphones & mobile phones', ukDutyRate: 0, euDutyRate: 0, requiresLicence: false, antiDumpingChina: false },
  { code: '85182900', description: 'Loudspeakers & audio equipment', ukDutyRate: 0, euDutyRate: 4.5, requiresLicence: false, antiDumpingChina: false },
  { code: '85044000', description: 'Static converters / power supplies', ukDutyRate: 0, euDutyRate: 0, requiresLicence: false, antiDumpingChina: false },
  { code: '85423100', description: 'Processors & controllers (ICs)', ukDutyRate: 0, euDutyRate: 0, requiresLicence: false, antiDumpingChina: false },
  { code: '85044090', description: 'Battery chargers & power banks', ukDutyRate: 0, euDutyRate: 0, requiresLicence: false, antiDumpingChina: false },
  { code: '85414010', description: 'LED lamps & lighting', ukDutyRate: 0, euDutyRate: 3.7, requiresLicence: false, antiDumpingChina: true, antiDumpingNote: 'Anti-dumping measures may apply. Check current EU/UK trade remedies register.' },
  { code: '85281200', description: 'LED televisions', ukDutyRate: 0, euDutyRate: 14, requiresLicence: false, antiDumpingChina: true, antiDumpingNote: 'Anti-dumping duties apply on Chinese-origin LCD panels. Verify current rates.' },
  { code: '61099000', description: 'T-shirts & vests (knitted)', ukDutyRate: 12, euDutyRate: 12, requiresLicence: false, antiDumpingChina: false, gspReduction: 9.6 },
  { code: '62034900', description: 'Trousers & jeans (woven)', ukDutyRate: 12, euDutyRate: 12, requiresLicence: false, antiDumpingChina: false, gspReduction: 9.6 },
  { code: '61102000', description: 'Jumpers & sweatshirts (cotton)', ukDutyRate: 12, euDutyRate: 12, requiresLicence: false, antiDumpingChina: false },
  { code: '64041900', description: 'Sports footwear (textile uppers)', ukDutyRate: 16.9, euDutyRate: 16.9, requiresLicence: false, antiDumpingChina: false },
  { code: '64029900', description: 'Other footwear (rubber/plastic)', ukDutyRate: 16.9, euDutyRate: 17, requiresLicence: false, antiDumpingChina: false },
  { code: '94016900', description: 'Upholstered seats & sofas', ukDutyRate: 0, euDutyRate: 0, requiresLicence: false, antiDumpingChina: true, antiDumpingNote: 'Wooden bedroom furniture AD measures — verify if applicable.' },
  { code: '94031090', description: 'Metal office furniture', ukDutyRate: 0, euDutyRate: 0, requiresLicence: false, antiDumpingChina: false },
  { code: '94054000', description: 'Table lamps & lighting fixtures', ukDutyRate: 0, euDutyRate: 3.7, requiresLicence: false, antiDumpingChina: true, antiDumpingNote: 'Energy-saving lamps AD duties — check current Trade Remedies Authority notices.' },
  { code: '73211100', description: 'Cooking appliances (gas/iron)', ukDutyRate: 1.7, euDutyRate: 1.7, requiresLicence: false, antiDumpingChina: false },
  { code: '84145930', description: 'Fans & air circulators', ukDutyRate: 0, euDutyRate: 0, requiresLicence: false, antiDumpingChina: false },
  { code: '84501100', description: 'Washing machines', ukDutyRate: 2.7, euDutyRate: 2.7, requiresLicence: false, antiDumpingChina: true, antiDumpingNote: 'Large household washing machines subject to anti-dumping investigation.' },
  { code: '84181000', description: 'Refrigerators & freezers', ukDutyRate: 2.7, euDutyRate: 2.7, requiresLicence: false, antiDumpingChina: false },
  { code: '85167200', description: 'Toasters', ukDutyRate: 0, euDutyRate: 0, requiresLicence: false, antiDumpingChina: false },
  { code: '85164000', description: 'Electric irons', ukDutyRate: 0, euDutyRate: 0, requiresLicence: false, antiDumpingChina: false },
  { code: '39241000', description: 'Plastic tableware & kitchenware', ukDutyRate: 6.5, euDutyRate: 6.5, requiresLicence: false, antiDumpingChina: false },
  { code: '73239300', description: 'Stainless steel cookware', ukDutyRate: 0, euDutyRate: 0, requiresLicence: false, antiDumpingChina: false },
  { code: '39269097', description: 'Plastic articles NES', ukDutyRate: 6.5, euDutyRate: 6.5, requiresLicence: false, antiDumpingChina: false },
  { code: '95030000', description: 'Toys — tricycles, dolls, models', ukDutyRate: 4.7, euDutyRate: 4.7, requiresLicence: true, licenceNote: 'UKCA/CE safety marking required. Compliance with UK Toys Regulations 2011.' },
  { code: '95044000', description: 'Playing cards & board games', ukDutyRate: 0, euDutyRate: 0, requiresLicence: false, antiDumpingChina: false },
  { code: '95069190', description: 'Fitness & exercise equipment', ukDutyRate: 0, euDutyRate: 2.7, requiresLicence: false, antiDumpingChina: false },
  { code: '61012000', description: 'Overcoats & jackets (wool)', ukDutyRate: 12, euDutyRate: 12, requiresLicence: false, antiDumpingChina: false },
  { code: '42022100', description: 'Handbags (leather)', ukDutyRate: 3.7, euDutyRate: 3.7, requiresLicence: false, antiDumpingChina: false },
  { code: '42021200', description: 'Luggage & travel bags', ukDutyRate: 3.7, euDutyRate: 3.7, requiresLicence: false, antiDumpingChina: false },
  { code: '71179000', description: 'Imitation jewellery', ukDutyRate: 4, euDutyRate: 4, requiresLicence: false, antiDumpingChina: false },
  { code: '33049900', description: 'Beauty & cosmetic products', ukDutyRate: 0, euDutyRate: 0, requiresLicence: true, licenceNote: 'UK Cosmetics Regulation (EU Exit) 2019 — must be registered with OPSS. Safety assessment required.' },
  { code: '33059000', description: 'Hair care products', ukDutyRate: 0, euDutyRate: 0, requiresLicence: true, licenceNote: 'UK Cosmetics Regulation applies. Product safety dossier required.' },
  { code: '30049000', description: 'Medicinal products NES', ukDutyRate: 0, euDutyRate: 0, requiresLicence: true, licenceNote: 'MHRA import licence required. Strict pharmaceutical regulations apply.' },
  { code: '21069098', description: 'Food preparations NES', ukDutyRate: 0, euDutyRate: 0, requiresLicence: true, licenceNote: 'UK Food Standards Agency pre-notification required. CITES may apply for some ingredients.' },
  { code: '09021000', description: 'Green tea (not fermented)', ukDutyRate: 0, euDutyRate: 0, requiresLicence: false, antiDumpingChina: false },
  { code: '18063200', description: 'Chocolate & cocoa products', ukDutyRate: 8, euDutyRate: 8, requiresLicence: false, antiDumpingChina: false },
  { code: '84821000', description: 'Ball bearings', ukDutyRate: 3.7, euDutyRate: 3.7, requiresLicence: false, antiDumpingChina: true, antiDumpingNote: 'Anti-dumping duties historically applied to Chinese ball bearings. Check current measures.' },
  { code: '76042900', description: 'Aluminium profiles & extrusions', ukDutyRate: 7.5, euDutyRate: 7.5, requiresLicence: false, antiDumpingChina: true, antiDumpingNote: 'Aluminium extrusions subject to AD duties from China.' },
  { code: '72142000', description: 'Steel rebar & sections', ukDutyRate: 0, euDutyRate: 0, requiresLicence: false, antiDumpingChina: true, antiDumpingNote: 'Various steel safeguard measures apply. Check Trade Remedies Authority.' },
  { code: '84798990', description: 'Industrial machines NES', ukDutyRate: 0, euDutyRate: 0, requiresLicence: false, antiDumpingChina: false },
  { code: '84733080', description: 'Parts for computers & printers', ukDutyRate: 0, euDutyRate: 0, requiresLicence: false, antiDumpingChina: false },
  { code: '87149900', description: 'Bicycle parts & accessories', ukDutyRate: 4.7, euDutyRate: 4.7, requiresLicence: false, antiDumpingChina: false },
  { code: '87120000', description: 'Bicycles', ukDutyRate: 14, euDutyRate: 14, requiresLicence: false, antiDumpingChina: true, antiDumpingNote: 'Anti-dumping duties have historically applied to Chinese bicycles in the EU.' },
  { code: '40161000', description: 'Rubber gloves & articles', ukDutyRate: 2.7, euDutyRate: 2.7, requiresLicence: false, antiDumpingChina: false },
  { code: '90189000', description: 'Medical instruments & devices', ukDutyRate: 0, euDutyRate: 0, requiresLicence: true, licenceNote: 'UKCA/CE marking required. Registration with MHRA as medical device.' },
  { code: '48192000', description: 'Folding cartons & packaging', ukDutyRate: 0, euDutyRate: 0, requiresLicence: false, antiDumpingChina: false },
  { code: '56012200', description: 'Wadding, padding & stuffing', ukDutyRate: 0, euDutyRate: 0, requiresLicence: false, antiDumpingChina: false },
];

export function lookupCNCode(code: string): CNCodeEntry | null {
  return CN_CODE_DATABASE.find(entry => entry.code === code.replace(/\s/g, '')) ?? null;
}

export function searchCNCodes(query: string): CNCodeEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return CN_CODE_DATABASE.filter(
    entry =>
      entry.code.includes(q) ||
      entry.description.toLowerCase().includes(q)
  ).slice(0, 8);
}
