export interface TeaSpec {
  id: number;
  name: string;
  liquid: string;
  accent: string;
  price: string;
  isCold: boolean;
}

export const TEAS: TeaSpec[] = [
  { id: 0, name: 'REGULAR TEA', liquid: '#C08A3E', accent: '#D7261E', price: '₹10', isCold: false },
  { id: 1, name: 'JAGGERY TEA', liquid: '#A66A2E', accent: '#E58A2A', price: '₹20', isCold: false },
  { id: 2, name: 'GINGER TEA', liquid: '#C9973F', accent: '#D97B29', price: '₹20', isCold: false },
  { id: 3, name: 'LEMON TEA', liquid: '#D9A441', accent: '#E8B93C', price: '₹20', isCold: false },
  { id: 4, name: 'BLACK TEA', liquid: '#7A4A20', accent: '#8A5A2B', price: '₹20', isCold: false },
  { id: 5, name: 'MASALA TEA', liquid: '#B07A35', accent: '#C7332B', price: '₹20', isCold: false },
  { id: 6, name: 'COLD TEA', liquid: '#E3B95C', accent: '#C95A4A', price: '₹30', isCold: true },
  { id: 7, name: 'SPECIAL MASALA MILK', liquid: '#E8C88A', accent: '#E7A229', price: '₹35', isCold: false },
];

export const GLASS_COUNT = 16;

export const INSTANCE_TILTS: readonly number[] = [
  0.10, -0.15, 0.07, -0.09, 0.14, -0.06, 0.12, -0.13,
  0.08, -0.11, 0.15, -0.07, 0.09, -0.14, 0.06, -0.10,
];

export interface StoryStep {
  index: number;
  tag: string;
  title: string;
  body: string;
  bandTitle: string;
  bandDetail: string;
  targetScrollVh: number;
}

export const STORY_STEPS: StoryStep[] = [
  {
    index: 0,
    tag: '01 — Recipe',
    title: 'STANDARDIZED RECIPE',
    body: 'One recipe, brewed the same way at all 650+ outlets — the same chai, wherever you are.',
    bandTitle: 'STANDARDIZED RECIPE',
    bandDetail: 'One recipe, brewed the same at 650+ outlets',
    targetScrollVh: 0.75 + (3.3 - 0.75) * (0.5 / 3),
  },
  {
    index: 1,
    tag: '02 — Fresh',
    title: 'NO PRESERVATIVES',
    body: 'Brewed fresh through the day and served hot. No preservatives, nothing artificial.',
    bandTitle: 'NO PRESERVATIVES',
    bandDetail: 'Brewed fresh, served hot, nothing artificial',
    targetScrollVh: 0.75 + (3.3 - 0.75) * (1.5 / 3),
  },
  {
    index: 2,
    tag: '03 — Vegetarian',
    title: '100% VEGETARIAN',
    body: 'Every item on the menu is vegetarian — from the cutting chai to the cream roll.',
    bandTitle: '100% VEGETARIAN',
    bandDetail: 'Every item on the menu, vegetarian',
    targetScrollVh: 0.75 + (3.3 - 0.75) * (2.5 / 3),
  },
];

export type MenuCategoryId = 'teas' | 'coffee-milk' | 'cakes-bakes' | 'coolers';

export interface MenuItem {
  name: string;
  price: string;
  signature?: boolean;
}

export interface MenuTab {
  id: MenuCategoryId;
  label: string;
  items: MenuItem[];
}

export const MENU_TABS: MenuTab[] = [
  {
    id: 'teas',
    label: 'Teas (12)',
    items: [
      { name: 'Regular Tea', price: '₹10' },
      { name: 'Jaggery Tea', price: '₹20', signature: true },
      { name: 'Ginger Tea', price: '₹20' },
      { name: 'Lemon Tea', price: '₹20' },
      { name: 'Black Tea', price: '₹20' },
      { name: 'Masala Tea', price: '₹20' },
      { name: 'Tea Without Sugar', price: '₹20' },
      { name: 'Less Sugar Tea', price: '₹20' },
      { name: 'Lemon Honey Mint Tea', price: '₹30' },
      { name: 'Ice Tea', price: '₹30' },
      { name: 'Peach Ice Tea', price: '₹30' },
      { name: 'Cold Tea', price: '₹30', signature: true },
    ],
  },
  {
    id: 'coffee-milk',
    label: 'Coffee & Milk (6)',
    items: [
      { name: 'Hot Coffee', price: '₹30' },
      { name: 'Cold Coffee', price: '₹60' },
      { name: 'Almond Milk', price: '₹35' },
      { name: 'Turmeric Milk', price: '₹35' },
      { name: 'Rose Milkshake', price: '₹60' },
      { name: 'Special Masala Milk', price: '₹35', signature: true },
    ],
  },
  {
    id: 'cakes-bakes',
    label: 'Cakes & Bakes (5)',
    items: [
      { name: 'Spongy Cake', price: '₹20' },
      { name: 'Cream Roll', price: '₹10' },
      { name: 'Jaggery Cream Roll', price: '₹18' },
      { name: 'Cookies', price: '₹26' },
      { name: 'Bakarwadi', price: '₹24' },
    ],
  },
  {
    id: 'coolers',
    label: 'Coolers (2)',
    items: [
      { name: 'Limbu Sarbat', price: '₹25' },
      { name: 'Aam Panna', price: '₹25' },
    ],
  },
];

export interface SignatureSpotlightItem {
  name: string;
  caption: string;
  image: string;
  alt: string;
}

export const SIGNATURES_SPOTLIGHT: SignatureSpotlightItem[] = [
  {
    name: 'JAGGERY TEA',
    caption: 'The gud chai regulars queue for',
    image: '/src/assets/images/sig_jaggery_tea_1795499528662.jpg',
    alt: 'Steaming cutting chai glass of Jaggery Tea on a stainless steel saucer',
  },
  {
    name: 'GINGER TEA',
    caption: 'Adrak Chaha',
    image: '/src/assets/images/sig_ginger_tea_1795499529336.jpg',
    alt: 'Steaming Ginger Tea (Adrak Chaha) in a glass on a steel saucer with fresh ginger',
  },
  {
    name: 'YEWALE SPECIAL CHAHA',
    caption: "Pune's signature cutting chai since 1983",
    image: '/src/assets/images/sig_yewale_special_chaha_1795499528801.jpg',
    alt: 'Hot masala chai pouring from a kettle into a cutting chai glass on a steel saucer',
  },
];

export const OUTLET_CITIES: string[] = [
  'Pune',
  'Mumbai',
  'Delhi',
  'Jaipur',
  'Nashik',
  'Nagpur',
  'Ahmedabad',
  'Surat',
  'Indore',
  'Guwahati',
];
