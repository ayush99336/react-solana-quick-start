import "./App.css";
import { useWeb3AuthConnect, useWeb3AuthDisconnect, useWeb3AuthUser } from "@web3auth/modal/react";
import { WALLET_CONNECTORS } from "@web3auth/modal";
import { useSolanaWallet } from "@web3auth/modal/react/solana";
// Legacy demo components are no longer shown by default; keep imports commented if needed later
// import { SignTransaction } from "./components/signTransaction";
// import { Balance } from "./components/getBalance";
// import { SendVersionedTransaction } from "./components/sendVersionedTransaction";
// import { SignMessage } from "./components/signMessage";
// import { SwitchChain } from "./components/switchNetwork";
import { CreatorDashboard } from "./components/CreatorDashboard";
import { CreatorDiscovery } from "./components/CreatorDiscovery";
import { MySubscriptions } from "./components/MySubscriptions";
import { ExclusiveContent } from "./components/ExclusiveContent";
import { SolanaPayHub } from "./components/SolanaPayHub";
import { Navbar } from "./components/Navbar";
import { useMemo, useState } from "react";
function App() {
  const { connect, isConnected, connectorName, loading: connectLoading, error: connectError } = useWeb3AuthConnect();
  const { disconnect, loading: disconnectLoading, error: disconnectError } = useWeb3AuthDisconnect();
  const { userInfo } = useWeb3AuthUser();
  const { accounts, connection } = useSolanaWallet();
  const address = accounts?.[0] || ''
  const shortAddr = useMemo(() => address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '', [address])
  const [copied, setCopied] = useState(false)
  const copyAddr = async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { }
  }

  const [page, setPage] = useState<'dashboard' | 'creator' | 'fan' | 'content' | 'solanapay' | 'settings'>('dashboard')
  const [transactionCount, setTransactionCount] = useState(0)

  const renderCurrentPage = () => {
    switch (page) {
      case 'dashboard':
        return (
          <div className="dashboard-container">
            {/* Header Section */}
            <div className="dashboard-header">
              <div>
                <h1 className="dashboard-title">Subscription Manager</h1>
                <p className="dashboard-subtitle">Manage your Web3 subscriptions and creator content</p>
              </div>
              <div className="dashboard-actions">
                <button
                  onClick={() => setPage('creator')}
                  className="action-button primary"
                >
                  📊 Creator Dashboard
                </button>
                <button
                  onClick={() => setPage('fan')}
                  className="action-button secondary"
                >
                  Browse Creators
                </button>
                <button
                  onClick={() => setPage('solanapay')}
                  className="action-button accent"
                >
                  Fund Wallet
                </button>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon"></div>
                <div className="stat-content">
                  <h3>Wallet</h3>
                  <div className="stat-value">{shortAddr}</div>
                  <button
                    onClick={copyAddr}
                    className="stat-action"
                  >
                    {copied ? 'Copied!' : 'Copy Address'}
                  </button>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🌐</div>
                <div className="stat-content">
                  <h3>Network</h3>
                  <div className="stat-value">Solana {connection?.rpcEndpoint.includes('devnet') ? 'Devnet' : 'Mainnet'}</div>
                  <div className="stat-status online">Connected</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⚡</div>
                <div className="stat-content">
                  <h3>Transactions</h3>
                  <div className="stat-value">{transactionCount}</div>
                  <div className="stat-status">Total completed</div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="dashboard-content">
              <ExclusiveContent />
            </div>
          </div>
        )
      case 'creator':
        return <CreatorDashboard />
      case 'fan':
        return (
          <div className="space-y-6">
            <CreatorDiscovery excludeCurrentUser={false} />
            <MySubscriptions />
          </div>
        )
      case 'content':
        return <ExclusiveContent />
      case 'solanapay':
        return <SolanaPayHub />
      case 'settings':
        return <div className="card"><h3>Settings</h3><div className="text-muted">Wallet and preferences.</div></div>
      default:
        return <div />
    }
  }

  const loggedInView = (
    <div className="app-container">
      <Navbar
        currentPage={page}
        setCurrentPage={setPage}
        disconnect={disconnect}
        accounts={accounts}
        connection={connection}
        transactionCount={transactionCount}
      />
      <main className="main-content">
        {disconnectError && <div className="error">{disconnectError.message}</div>}
        {renderCurrentPage()}
      </main>
    </div>
  );

  const unloggedInView = (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1 className="logo">Creator<span>Pass</span></h1>
          <div className="login-badge">Premium</div>
        </div>
        <h2>Web3 Subscription Manager</h2>
        <p className="login-description">
          Manage creator subscriptions seamlessly on Solana<br />
          Secure, seedless authentication with Web3Auth<br />
          Direct creator support & exclusive content access
        </p>
        <button onClick={() => connect()} className="login-button">
          🔗 Connect Wallet & Get Started
        </button>
        {connectLoading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>Connecting your wallet...</span>
          </div>
        )}
        {connectError && (
          <div className="error-state">
            ⚠️ {connectError.message}
          </div>
        )}
      </div>
    </div>
  );

  return isConnected ? loggedInView : unloggedInView;
}

export default App;
