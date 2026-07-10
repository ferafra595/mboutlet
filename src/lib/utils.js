export const euro = (value) => new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
}).format(Number(value) || 0);

export const number = (value) => new Intl.NumberFormat('it-IT').format(Number(value) || 0);

export const localDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const localTime = () => new Date().toLocaleTimeString('it-IT', {
  hour: '2-digit',
  minute: '2-digit',
});

export const monthKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const monthLabel = (key) => new Date(`${key}-01T12:00:00`).toLocaleDateString('it-IT', {
  month: 'long',
  year: 'numeric',
});

export function calculateCommission(revenue) {
  const amount = Math.max(0, Number(revenue) || 0);
  const tiers = [
    { from: 0, to: 5000, rate: 10 },
    { from: 5000, to: 7500, rate: 12.5 },
    { from: 7500, to: Infinity, rate: 15 },
  ];

  let total = 0;
  const details = tiers.map((tier) => {
    const taxable = Math.max(0, Math.min(amount, tier.to) - tier.from);
    const commission = taxable * tier.rate / 100;
    total += commission;
    return { ...tier, taxable, commission };
  });

  return { total, details };
}

export const currentRate = (revenue) => {
  const amount = Number(revenue) || 0;
  if (amount >= 7500) return 15;
  if (amount >= 5000) return 12.5;
  return 10;
};
