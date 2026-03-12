import { NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useAppContext } from './state/AppContext';
import { calculateInterest, calculateRepayment, formatBtc, formatUsd, getDaysLeft } from './lib/finance';

function Shell({ children }) {
  const { wallet, wallets, walletError, isConnectingWallet, connectWallet, disconnectWallet } = useAppContext();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Bitcoin-native credit desk</p>
          <NavLink to="/" className="brand">
            SatLend
          </NavLink>
        </div>
        <nav className="nav">
          <NavLink to="/">Marketplace</NavLink>
          <NavLink to="/lend">Lend</NavLink>
          <NavLink to="/borrow">Borrow</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
        </nav>
        <div className="wallet-panel">
          {wallet.connected ? (
            <div className="wallet-chip">
              <span>{wallet.provider}</span>
              <strong>{wallet.shortAddress}</strong>
              <small>{formatBtc(wallet.balanceBtc)}</small>
              <button type="button" className="secondary-button" onClick={disconnectWallet}>
                Disconnect
              </button>
            </div>
          ) : (
            <div className="wallet-actions">
              {wallets.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="secondary-button"
                  onClick={() => connectWallet(item.id)}
                  disabled={isConnectingWallet || !item.installed}
                  title={item.installed ? `Connect ${item.label}` : `${item.label} extension not found`}
                >
                  {isConnectingWallet ? 'Connecting...' : `Connect ${item.label}`}
                </button>
              ))}
            </div>
          )}
          {walletError ? <p className="wallet-error">{walletError}</p> : null}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

function Hero() {
  const { dashboard } = useAppContext();

  return (
    <section className="hero">
      <div>
        <p className="eyebrow">Deploy-ready MVP</p>
        <h1>P2P lending marketplace for BTC liquidity against Ordinals and BRC-20.</h1>
        <p className="hero-copy">
          Lenders post fixed-rate offers, borrowers lock collateral, and the protocol tracks active loans,
          repayment windows, and liquidation after a 24-hour grace period.
        </p>
      </div>
      <div className="stats-grid">
        <StatCard label="Active loans" value={dashboard.activeLoans} />
        <StatCard label="Open offers" value={dashboard.openOffers} />
        <StatCard label="Outstanding" value={formatBtc(dashboard.totalOutstanding)} />
        <StatCard label="Available liquidity" value={formatBtc(dashboard.totalLiquidity)} />
      </div>
    </section>
  );
}

function StatCard({ label, value }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function MarketplacePage() {
  const { offers, acceptOffer, wallet } = useAppContext();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    collateralType: 'All',
    durationDays: 'All',
    sortBy: 'apr',
  });

  const openOffers = offers.filter((offer) => offer.status === 'open');
  const visibleOffers = openOffers
    .filter((offer) => {
      const collateralMatch =
        filters.collateralType === 'All' || offer.collateralType === filters.collateralType;
      const durationMatch =
        filters.durationDays === 'All' || String(offer.durationDays) === filters.durationDays;

      return collateralMatch && durationMatch;
    })
    .sort((a, b) => {
      if (filters.sortBy === 'principal') {
        return b.principal - a.principal;
      }
      if (filters.sortBy === 'duration') {
        return a.durationDays - b.durationDays;
      }
      return a.apr - b.apr;
    });

  const handleAccept = (offerId) => {
    const loan = acceptOffer(offerId);
    if (loan) {
      navigate(`/loan/${loan.id}`);
    }
  };

  return (
    <Shell>
      <Hero />
      <section className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Open marketplace</p>
            <h2>Offers available for matching</h2>
          </div>
          <div className="filters">
            <select
              value={filters.collateralType}
              onChange={(event) => setFilters((current) => ({ ...current, collateralType: event.target.value }))}
            >
              <option>All</option>
              <option>Ordinal</option>
              <option>BRC-20</option>
            </select>
            <select
              value={filters.durationDays}
              onChange={(event) => setFilters((current) => ({ ...current, durationDays: event.target.value }))}
            >
              <option value="All">Any duration</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
            <select
              value={filters.sortBy}
              onChange={(event) => setFilters((current) => ({ ...current, sortBy: event.target.value }))}
            >
              <option value="apr">Lowest APR</option>
              <option value="principal">Highest amount</option>
              <option value="duration">Shortest term</option>
            </select>
          </div>
        </div>
        <div className="card-grid">
          {visibleOffers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              canAccept={wallet.connected}
              onAccept={() => handleAccept(offer.id)}
            />
          ))}
        </div>
      </section>
    </Shell>
  );
}

function OfferCard({ offer, onAccept, canAccept }) {
  const projectedInterest = calculateInterest(offer.principal, offer.apr, offer.durationDays);

  return (
    <article className="panel offer-card">
      <div className="badge-row">
        <span className={`badge ${offer.side}`}>{offer.side === 'lend' ? 'Lender offer' : 'Borrow request'}</span>
        <span className="badge neutral">{offer.collateralType}</span>
      </div>
      <h3>{formatBtc(offer.principal)}</h3>
      <p>{offer.summary}</p>
      <dl className="meta-grid">
        <div>
          <dt>APR</dt>
          <dd>{offer.apr}%</dd>
        </div>
        <div>
          <dt>Term</dt>
          <dd>{offer.durationDays} days</dd>
        </div>
        <div>
          <dt>Min collateral</dt>
          <dd>{formatUsd(offer.collateralFloorUsd)}</dd>
        </div>
        <div>
          <dt>LTV</dt>
          <dd>{offer.ltv}%</dd>
        </div>
      </dl>
      <div className="offer-footer">
        <div>
          <span className="muted">Projected interest</span>
          <strong>{formatBtc(projectedInterest)}</strong>
        </div>
        <button onClick={onAccept} disabled={!canAccept} title={canAccept ? 'Accept offer' : 'Connect wallet first'}>
          Accept
        </button>
      </div>
    </article>
  );
}

function OfferForm({ side }) {
  const { createOffer, wallet } = useAppContext();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    principal: side === 'lend' ? '0.10' : '0.08',
    apr: side === 'lend' ? '14' : '16',
    durationDays: '30',
    collateralType: 'Ordinal',
    collateralFloorUsd: side === 'lend' ? '6000' : '4800',
    ltv: '60',
    summary: side === 'lend' ? 'Fixed-rate BTC offer for blue-chip collateral.' : 'Seeking BTC liquidity without selling the asset.',
  });

  const estimatedRepayment = calculateRepayment(
    Number(form.principal),
    Number(form.apr),
    Number(form.durationDays),
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    createOffer({
      side,
      principal: Number(form.principal),
      apr: Number(form.apr),
      durationDays: Number(form.durationDays),
      collateralType: form.collateralType,
      collateralFloorUsd: Number(form.collateralFloorUsd),
      ltv: Number(form.ltv),
      summary: form.summary,
      lender: side === 'lend' ? wallet.address : undefined,
      borrower: side === 'borrow' ? wallet.address : undefined,
    });
    navigate(side === 'lend' ? '/' : '/');
  };

  return (
    <Shell>
      <section className="form-layout">
        <div className="panel">
          <p className="eyebrow">{side === 'lend' ? 'Lender desk' : 'Borrower desk'}</p>
          <h1>{side === 'lend' ? 'Create a funding offer' : 'Create a borrowing request'}</h1>
          <p className="hero-copy">
            The form mirrors the MVP fields from the implementation plan: principal, APR, term, collateral type,
            and minimum collateral value.
          </p>
        </div>
        <form className="panel form-panel" onSubmit={handleSubmit}>
          {!wallet.connected ? (
            <div className="form-warning">
              Connect a wallet before publishing an offer so the BTC address is attached to the listing.
            </div>
          ) : null}
          <label>
            Amount in BTC
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.principal}
              onChange={(event) => setForm((current) => ({ ...current, principal: event.target.value }))}
            />
          </label>
          <label>
            APR %
            <input
              type="number"
              min="1"
              step="1"
              value={form.apr}
              onChange={(event) => setForm((current) => ({ ...current, apr: event.target.value }))}
            />
          </label>
          <label>
            Term
            <select
              value={form.durationDays}
              onChange={(event) => setForm((current) => ({ ...current, durationDays: event.target.value }))}
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
          </label>
          <label>
            Collateral type
            <select
              value={form.collateralType}
              onChange={(event) => setForm((current) => ({ ...current, collateralType: event.target.value }))}
            >
              <option>Ordinal</option>
              <option>BRC-20</option>
            </select>
          </label>
          <label>
            Minimum collateral value, USD
            <input
              type="number"
              min="1000"
              step="100"
              value={form.collateralFloorUsd}
              onChange={(event) =>
                setForm((current) => ({ ...current, collateralFloorUsd: event.target.value }))
              }
            />
          </label>
          <label>
            LTV %
            <input
              type="number"
              min="30"
              max="80"
              step="1"
              value={form.ltv}
              onChange={(event) => setForm((current) => ({ ...current, ltv: event.target.value }))}
            />
          </label>
          <label>
            Summary
            <textarea
              rows="4"
              value={form.summary}
              onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
            />
          </label>
          <div className="summary-box">
            <span>Projected repayment at maturity</span>
            <strong>{formatBtc(estimatedRepayment)}</strong>
          </div>
          <button type="submit" disabled={!wallet.connected}>
            {side === 'lend' ? 'Publish offer' : 'Publish request'}
          </button>
        </form>
      </section>
    </Shell>
  );
}

function DashboardPage() {
  const { loans, wallet, repayLoan } = useAppContext();
  const userLoans = wallet.connected
    ? loans.filter((loan) => loan.lender === wallet.address || loan.borrower === wallet.address)
    : [];

  return (
    <Shell>
      <section className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Portfolio</p>
            <h1>Active loans and deadlines</h1>
          </div>
          <div className="wallet-stack">
            <strong>{wallet.connected ? wallet.address : 'Wallet not connected'}</strong>
            <span>{wallet.ordinals} Ordinals</span>
            <span>{wallet.brc20Positions} BRC-20 positions</span>
          </div>
        </div>
        <div className="loan-list">
          {userLoans.length === 0 ? (
            <p className="muted">Newly created marketplace. Accept an offer to populate your dashboard.</p>
          ) : (
            userLoans.map((loan) => <LoanCard key={loan.id} loan={loan} onRepay={() => repayLoan(loan.id)} />)
          )}
        </div>
      </section>
    </Shell>
  );
}

function LoanCard({ loan, onRepay }) {
  const daysLeft = getDaysLeft(loan.deadline);
  const repayment = calculateRepayment(loan.principal, loan.apr, loan.durationDays);

  return (
    <article className="panel loan-card">
      <div className="section-head compact">
        <div>
          <h3>{loan.id}</h3>
          <p className="muted">{loan.collateralAsset}</p>
        </div>
        <span className={`badge ${loan.status}`}>{loan.status}</span>
      </div>
      <dl className="meta-grid">
        <div>
          <dt>Principal</dt>
          <dd>{formatBtc(loan.principal)}</dd>
        </div>
        <div>
          <dt>Repayment</dt>
          <dd>{formatBtc(repayment)}</dd>
        </div>
        <div>
          <dt>Deadline</dt>
          <dd>{new Date(loan.deadline).toLocaleDateString('en-US')}</dd>
        </div>
        <div>
          <dt>Time left</dt>
          <dd>{daysLeft > 0 ? `${daysLeft} days` : 'Grace/default'}</dd>
        </div>
      </dl>
      {loan.status === 'active' || loan.status === 'grace' ? <button onClick={onRepay}>Repay</button> : null}
    </article>
  );
}

function LoanDetailsPage() {
  const { id } = useParams();
  const { loans } = useAppContext();
  const loan = loans.find((item) => item.id === id);

  if (!loan) {
    return (
      <Shell>
        <section className="panel">
          <h1>Loan not found</h1>
          <p className="muted">Accept an offer from the marketplace to create a new loan position.</p>
        </section>
      </Shell>
    );
  }

  return (
    <Shell>
      <section className="detail-layout">
        <article className="panel">
          <p className="eyebrow">Loan details</p>
          <h1>{loan.id}</h1>
          <p className="hero-copy">
            Escrow path: collateral locked into a 2-of-3 multisig, BTC released to borrower, default handled after
            the grace window.
          </p>
          <dl className="detail-list">
            <div>
              <dt>Collateral</dt>
              <dd>{loan.collateralAsset}</dd>
            </div>
            <div>
              <dt>Lender</dt>
              <dd>{loan.lender}</dd>
            </div>
            <div>
              <dt>Borrower</dt>
              <dd>{loan.borrower}</dd>
            </div>
            <div>
              <dt>Repayment amount</dt>
              <dd>{formatBtc(calculateRepayment(loan.principal, loan.apr, loan.durationDays))}</dd>
            </div>
            <div>
              <dt>Grace deadline</dt>
              <dd>{new Date(loan.graceDeadline).toLocaleString('en-US')}</dd>
            </div>
          </dl>
        </article>
        <article className="panel timeline-panel">
          <p className="eyebrow">Lifecycle</p>
          <ul className="timeline">
            <li>Offer accepted and collateral locked</li>
            <li>BTC disbursed to borrower</li>
            <li>Repay before deadline to reclaim collateral</li>
            <li>Automatic liquidation after 24-hour grace period</li>
          </ul>
        </article>
      </section>
    </Shell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MarketplacePage />} />
      <Route path="/lend" element={<OfferForm side="lend" />} />
      <Route path="/borrow" element={<OfferForm side="borrow" />} />
      <Route path="/loan/:id" element={<LoanDetailsPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
    </Routes>
  );
}
