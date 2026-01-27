
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Sistema de redondeo inteligente
// 2220 -> 2200 (0-29 -> 00)
// 2240 -> 2250 (30-55 -> 50)
// 2260 -> 2300 (56-99 -> 100)
export const smartRound = (value: number): number => {
  const remainder = value % 100;
  const base = value - remainder;

  if (remainder < 30) {
    return base;
  } else if (remainder < 56) {
    return base + 50;
  } else {
    return base + 100;
  }
};
