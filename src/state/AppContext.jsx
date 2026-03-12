import { createContext, useContext, useEffect, useState } from 'react';
import { initialLoans, initialOffers } from '../data/mockData';
import { calculateRepayment } from '../lib/finance';
import { connectWallet, createDisconnectedWallet, getAvailableWallets } from '../lib/wallet';

const AppContext = createContext(null);

function createLoanFromOffer(offer, walletAddress) {
  const start = new Date();
  const deadline = new Date(start.getTime() + offer.durationDays * 24 * 60 * 60 * 1000);
  const graceDeadline = new Date(deadline.getTime() + 24 * 60 * 60 * 1000);

  return {
    id: `loan-${Math.random().toString(36).slice(2, 8)}`,
    offerId: offer.id,
    principal: offer.principal,
    apr: offer.apr,
    durationDays: offer.durationDays,
    startedAt: start.toISOString(),
    deadline: deadline.toISOString(),
    graceDeadline: graceDeadline.toISOString(),
    status: 'active',
    collateralType: offer.collateralType,
    collateralAsset: offer.collateralType === 'Ordinal' ? 'Ordinal #New' : 'BRC-20 Basket',
    lender: offer.lender ?? walletAddress,
    borrower: offer.borrower ?? walletAddress,
  };
}

export function AppProvider({ children }) {
  const [offers, setOffers] = useState(initialOffers);
  const [loans, setLoans] = useState(initialLoans);
  const [wallet, setWallet] = useState(createDisconnectedWallet);
  const [wallets, setWallets] = useState([]);
  const [walletError, setWalletError] = useState('');
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);

  useEffect(() => {
    setWallets(getAvailableWallets());
  }, []);

  const createOffer = (payload) => {
    const nextOffer = {
      ...payload,
      id: `offer-${Math.random().toString(36).slice(2, 8)}`,
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    setOffers((current) => [nextOffer, ...current]);
    return nextOffer;
  };

  const handleConnectWallet = async (providerId) => {
    setIsConnectingWallet(true);
    setWalletError('');

    try {
      const nextWallet = await connectWallet(providerId);
      setWallet(nextWallet);
      setWallets(getAvailableWallets());
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Failed to connect wallet');
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const disconnectWallet = () => {
    setWallet(createDisconnectedWallet());
    setWalletError('');
  };

  const acceptOffer = (offerId) => {
    const offer = offers.find((item) => item.id === offerId);
    if (!offer) {
      return null;
    }

    const loan = createLoanFromOffer(offer, wallet.address || 'wallet-not-connected');
    setOffers((current) => current.map((item) => (item.id === offerId ? { ...item, status: 'matched' } : item)));
    setLoans((current) => [loan, ...current]);
    return loan;
  };

  const repayLoan = (loanId) => {
    setLoans((current) => current.map((loan) => (loan.id === loanId ? { ...loan, status: 'repaid' } : loan)));
  };

  const activeLoans = loans.filter((loan) => ['active', 'grace'].includes(loan.status));
  const openOffers = offers.filter((offer) => offer.status === 'open');
  const dashboard = {
    activeLoans: activeLoans.length,
    openOffers: openOffers.length,
    totalOutstanding: activeLoans.reduce(
      (sum, loan) => sum + calculateRepayment(loan.principal, loan.apr, loan.durationDays),
      0,
    ),
    totalLiquidity: offers
      .filter((offer) => offer.side === 'lend' && offer.status === 'open')
      .reduce((sum, offer) => sum + offer.principal, 0),
  };

  const value = {
    offers,
    loans,
    wallet,
    wallets,
    walletError,
    isConnectingWallet,
    dashboard,
    connectWallet: handleConnectWallet,
    disconnectWallet,
    createOffer,
    acceptOffer,
    repayLoan,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }

  return context;
}
