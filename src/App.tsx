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
import { ExclusiveContent } from "./components/ExclusiveContent";
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

  const [page, setPage] = useState<'dashboard' | 'creator' | 'fan' | 'content' | 'settings'>('dashboard')
  const [transactionCount, setTransactionCount] = useState(0)

  const renderCurrentPage = () => {
    switch (page) {
      case 'dashboard':
        return (
          <div className="grid">
            <div className="card"><h3>Status</h3><div className="text-muted">Connected</div></div>
            <ExclusiveContent />
          </div>
        )
      case 'creator':
        return <CreatorDashboard />
      case 'fan':
        return <div className="card"><h3>Fan</h3><div className="text-muted">Subscribe or renew passes.</div></div>
      case 'content':
        return <ExclusiveContent />
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
        <h1 className="logo">Creator<span>Pass</span></h1>
        <h2>Seedless Subscriptions on Solana</h2>
        <p>Login with Web3Auth to manage creator tiers and unlock content.</p>
        <button onClick={() => connect()} className="login-button">Connect with Web3Auth</button>
        {connectLoading && <div className="loading" style={{ marginTop: 12 }}>Connecting...</div>}
        {connectError && <div className="error" style={{ marginTop: 12 }}>{connectError.message}</div>}
      </div>
    </div>
  );

  return isConnected ? loggedInView : unloggedInView;
}

export default App;
