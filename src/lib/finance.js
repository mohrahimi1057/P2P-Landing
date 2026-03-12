export function calculateInterest(principal, apr, days) {
  return principal * (apr / 100 / 365) * days;
}

export function calculateRepayment(principal, apr, days) {
  return principal + calculateInterest(principal, apr, days);
}

export function formatBtc(value) {
  return `${value.toFixed(5)} BTC`;
}

export function formatUsd(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function getDaysLeft(deadline) {
  const end = new Date(deadline).getTime();
  const now = Date.now();
  const diff = end - now;

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
