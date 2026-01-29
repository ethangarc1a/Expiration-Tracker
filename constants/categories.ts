export const CATEGORIES = [
  'Dairy',
  'Meat',
  'Produce',
  'Frozen',
  'Pantry',
  'Beverages',
  'Condiments',
  'Snacks',
  'Medicine',
  'Household',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const DEFAULT_CATEGORY: Category = 'Other';
