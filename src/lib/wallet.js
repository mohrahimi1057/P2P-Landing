const SATOSHIS_IN_BTC = 100000000;

function shortenAddress(address) {
  if (!address) {
    return '';
  }

  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function satsToBtc(value) {
  return Number(value ?? 0) / SATOSHIS_IN_BTC;
}

function normalizeAccount(rawAccount) {
  if (!rawAccount) {
    return null;
  }

  if (typeof rawAccount === 'string') {
    return rawAccount;
  }

  return (
    rawAccount.address ??
    rawAccount.paymentAddress ??
    rawAccount.payment?.address ??
    rawAccount.btcAddress ??
    rawAccount.ordinalsAddress ??
    null
  );
}

function normalizeBalance(rawBalance) {
  if (rawBalance == null) {
    return 0;
  }

  if (typeof rawBalance === 'number') {
    return rawBalance;
  }

  if (typeof rawBalance === 'string') {
    return Number(rawBalance);
  }

  const satoshiBalance =
    rawBalance.total ??
    rawBalance.confirmed ??
    rawBalance.available ??
    rawBalance.satoshis ??
    rawBalance.amount;

  if (typeof satoshiBalance === 'number' || typeof satoshiBalance === 'string') {
    return satsToBtc(satoshiBalance);
  }

  if (typeof rawBalance.btc === 'number') {
    return rawBalance.btc;
  }

  return 0;
}

function getUniSatProvider() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.opnet ?? null;
}

async function connectOpWallet() {
  const provider = getUniSatProvider();
  if (!provider) {
    throw new Error('OP_WALLET extension not found');
  }

  const accounts = typeof provider.requestAccounts === 'function'
    ? await provider.requestAccounts()
    : await provider.getAccounts?.();
  const address = normalizeAccount(accounts?.[0]);

  if (!address) {
    throw new Error('OP_WALLET did not return a BTC address');
  }

  const balance = typeof provider.getBalance === 'function' ? await provider.getBalance() : null;

  return {
    connected: true,
    provider: 'OP_WALLET',
    providerId: 'op_wallet',
    address,
    shortAddress: shortenAddress(address),
    balanceBtc: normalizeBalance(balance),
    ordinals: 0,
    brc20Positions: 0,
  };
}

export function createDisconnectedWallet() {
  return {
    connected: false,
    provider: 'Not connected',
    providerId: null,
    address: '',
    shortAddress: '',
    balanceBtc: 0,
    ordinals: 0,
    brc20Positions: 0,
  };
}

export function getAvailableWallets() {
  return [
    {
      id: 'op_wallet',
      label: 'Connect OP_WALLET',
      installed: Boolean(getUniSatProvider()),
    },
  ];
}

export async function connectWallet(providerId) {
  if (providerId === 'op_wallet') {
    return connectOpWallet();
  }

  throw new Error(`Unsupported wallet provider: ${providerId}`);
}
