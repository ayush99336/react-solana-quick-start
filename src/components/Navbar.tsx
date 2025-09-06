import { useState } from 'react'
import { Button } from './ui/button'
import { BalanceDisplay } from './BalanceDisplay'
import Icon from './Icon'

export function Navbar({ currentPage, setCurrentPage, disconnect, accounts, connection, transactionCount }: any) {
    const [copyText, setCopyText] = useState('Copy')
    const address = accounts?.[0] as string | undefined

    const handleCopyAddress = async () => {
        if (!address) return
        try {
            await navigator.clipboard.writeText(address)
            setCopyText('Copied!')
            setTimeout(() => setCopyText('Copy'), 2000)
        } catch { }
    }

    const short = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''

    return (
        <header className="app-header">
            <div className="nav-brand">
                <div className="logo" onClick={() => setCurrentPage('dashboard')}>
                    Sub<span>Sync</span>
                </div>
                <div className="brand-subtitle">Subscription Manager</div>
            </div>
            <nav className="main-nav">
                <Button
                    variant={currentPage === 'dashboard' ? 'secondary' : 'ghost'}
                    onClick={() => setCurrentPage('dashboard')}
                    className="nav-button"
                >
                    Dashboard
                </Button>
                <Button
                    variant={currentPage === 'creator' ? 'secondary' : 'ghost'}
                    onClick={() => setCurrentPage('creator')}
                    className="nav-button"
                >
                    Creator Hub
                </Button>
                <Button
                    variant={currentPage === 'fan' ? 'secondary' : 'ghost'}
                    onClick={() => setCurrentPage('fan')}
                    className="nav-button"
                >
                    Browse & Subscribe
                </Button>
                <Button
                    variant={currentPage === 'content' ? 'secondary' : 'ghost'}
                    onClick={() => setCurrentPage('content')}
                    className="nav-button"
                >
                    Exclusive Content
                </Button>
                <Button
                    variant={currentPage === 'solanapay' ? 'secondary' : 'ghost'}
                    onClick={() => setCurrentPage('solanapay')}
                    className="nav-button"
                >
                    Solana Pay
                </Button>
                <Button
                    variant={currentPage === 'settings' ? 'secondary' : 'ghost'}
                    onClick={() => setCurrentPage('settings')}
                    className="nav-button"
                >
                    Settings
                </Button>
            </nav>
            <div className="user-section">
                <div className="user-info">
                    <div className="wallet-info">
                        <div className="wallet-details">
                            <span className="wallet-label">Wallet</span>
                            <span className="wallet-address">{short}</span>
                        </div>
                        <button onClick={handleCopyAddress} className="copy-button" title="Copy address" aria-label="Copy address">
                            <Icon name="copy" className="text-gray-600" />
                        </button>
                        <BalanceDisplay connection={connection} account={address} refreshTrigger={transactionCount} />
                    </div>
                    <button onClick={() => disconnect()} className="logout-button">
                        <Icon name="settings" className="mr-2" /> Disconnect
                    </button>
                </div>
            </div>
        </header>
    )
}
