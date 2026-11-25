export type CipherShape = 'triangle' | 'circle' | 'square' | 'diamond';

export const shapeGlyphs: Record<CipherShape, string> = {
  triangle: '△',
  circle: '○',
  square: '□',
  diamond: '◇',
};

export const digitCipher: Record<string, readonly [CipherShape, CipherShape]> = {
  '0': ['triangle', 'triangle'],
  '1': ['triangle', 'circle'],
  '2': ['triangle', 'square'],
  '3': ['triangle', 'diamond'],
  '4': ['circle', 'triangle'],
  '5': ['circle', 'circle'],
  '6': ['circle', 'square'],
  '7': ['circle', 'diamond'],
  '8': ['square', 'triangle'],
  '9': ['square', 'circle'],
};

export function encodeNumber(value: string): CipherShape[][] {
  return [...value].map((digit) => {
    const pair = digitCipher[digit];
    if (!pair) {
      throw new Error(`Cannot encode non-digit value: ${digit}`);
    }
    return [...pair];
  });
}
