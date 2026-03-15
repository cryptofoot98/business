export const PRODUCT_COLORS = [
  '#c63320',
  '#d96a1c',
  '#1c7a50',
  '#1a5f8a',
  '#8a3c1c',
  '#5a7a1c',
  '#1c6a7a',
  '#7a1c50',
  '#3c7a1c',
  '#c4941a',
  '#1a7a7a',
  '#7a4a1c',
  '#1a4a7a',
  '#7a1c1c',
  '#1a7a40',
  '#c45a1a',
  '#1a5a40',
  '#7a5a1c',
  '#1a407a',
  '#1a7a60',
];

export const PRODUCT_LABELS = [
  'Product A', 'Product B', 'Product C', 'Product D', 'Product E',
  'Product F', 'Product G', 'Product H', 'Product I', 'Product J',
  'Product K', 'Product L', 'Product M', 'Product N', 'Product O',
  'Product P', 'Product Q', 'Product R', 'Product S', 'Product T',
];

export const MAX_PRODUCTS = 20;

export function getProductColor(index: number): string {
  return PRODUCT_COLORS[index % PRODUCT_COLORS.length];
}
