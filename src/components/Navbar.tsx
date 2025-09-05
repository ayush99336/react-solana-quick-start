import { useState } from 'react'
import { Button } from './ui/button'
import { BalanceDisplay } from './BalanceDisplay'

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
            <div className="logo" onClick={() => setCurrentPage('dashboard')}>
                Creator<span>Pass</span>
            </div>
            <nav className="main-nav">
                <Button variant={currentPage === 'dashboard' ? 'secondary' : 'ghost'} onClick={() => setCurrentPage('dashboard')}>Dashboard</Button>
                <Button variant={currentPage === 'creator' ? 'secondary' : 'ghost'} onClick={() => setCurrentPage('creator')}>Creator</Button>
                <Button variant={currentPage === 'fan' ? 'secondary' : 'ghost'} onClick={() => setCurrentPage('fan')}>Fan</Button>
                <Button variant={currentPage === 'content' ? 'secondary' : 'ghost'} onClick={() => setCurrentPage('content')}>Content</Button>
                <Button variant={currentPage === 'settings' ? 'secondary' : 'ghost'} onClick={() => setCurrentPage('settings')}>Settings</Button>
            </nav>
            <div className="user-section">
                <div className="user-info">
                    <div className="wallet-info">
                        <small>{short}</small>
                        <button onClick={handleCopyAddress} className="copy-button" title="Copy address">{copyText}</button>
                        <BalanceDisplay connection={connection} account={address} refreshTrigger={transactionCount} />
                    </div>
                    <button onClick={() => disconnect()} className="logout-button">Log Out</button>
                </div>
            </div>
        </header>
    )
}
