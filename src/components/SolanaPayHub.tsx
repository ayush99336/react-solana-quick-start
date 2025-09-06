import { useState } from 'react'
import { useSolanaWallet } from '@web3auth/modal/react/solana'
import Icon from './Icon'
import { WalletFunding } from './WalletFunding'

export function SolanaPayHub() {
    const { accounts, connection } = useSolanaWallet()
    const wallet = accounts?.[0]
    const [activeTab, setActiveTab] = useState<'fund' | 'info'>('fund')

    if (!wallet) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="shadow-lg p-8 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 rounded-lg max-w-md text-center">
                    <Icon name="wallet" className="text-6xl mb-4 text-purple-700 dark:text-purple-200" />
                    <h3 className="text-xl font-bold text-purple-700 dark:text-purple-200 mb-2">Connect Your Wallet</h3>
                    <p className="text-gray-600 dark:text-gray-300">Please connect your wallet to access Solana Pay features</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto px-4 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Solana Pay Hub
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                    Fund your wallet and make payments using Solana Pay - the universal QR code payment standard for Solana
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex justify-center">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex">
                    <button
                        onClick={() => setActiveTab('fund')}
                        className={`px-6 py-2 rounded-md transition ${activeTab === 'fund' ? 'bg-white text-gray-900 dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:bg-white hover:bg-opacity-20 dark:hover:bg-white dark:hover:bg-opacity-10'}`}
                    >
                        Fund Wallet
                    </button>
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`px-6 py-2 rounded-md transition ${activeTab === 'info' ? 'bg-white text-gray-900 dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:bg-white hover:bg-opacity-20 dark:hover:bg-white dark:hover:bg-opacity-10'}`}
                    >
                        How It Works
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                {activeTab === 'fund' && (
                    <WalletFunding onFundingComplete={(signature, amount) => {
                        console.log(`Wallet funded with ${amount} SOL, signature: ${signature}`)
                    }} />
                )}

                {activeTab === 'info' && (
                    <div className="space-y-6">
                        {/* What is Solana Pay */}
                        <div className="shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 rounded-lg overflow-hidden mx-auto w-full">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="flex items-center gap-2 text-2xl text-blue-700 dark:text-blue-200">
                                    <Icon name="qr" className="w-6 h-6" /> What is Solana Pay?
                                </h3>
                            </div>
                            <div className="p-6 space-y-4 bg-white dark:bg-blue-950">
                                <p className="text-blue-700 dark:text-blue-300">
                                    Solana Pay is the universal QR code payment standard for the Solana blockchain, enabling seamless transactions between wallets.
                                </p>
                                <div className="grid gap-3">
                                    {['Universal', 'Secure', 'Mobile-First'].map((label) => (
                                        <div key={label} className="flex items-center gap-3 p-3 bg-white dark:bg-blue-950 rounded-lg">
                                            <Icon name="check" className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            <div>
                                                <h4 className="font-semibold text-blue-800 dark:text-blue-200">{label}</h4>
                                                <p className="text-sm text-blue-600 dark:text-blue-400">{label === 'Universal' ? 'Works with any Solana wallet app' : label === 'Secure' ? 'No private key sharing required' : 'Optimized for mobile wallet experiences'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* How to Use */}
                        <div className="shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 rounded-lg overflow-hidden mx-auto w-full">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="flex items-center gap-2 text-2xl text-green-700 dark:text-green-200">
                                    <Icon name="settings" className="w-6 h-6" /> How to Use Solana Pay
                                </h3>
                            </div>
                            <div className="p-6 bg-white dark:bg-emerald-950 space-y-4">
                                {[
                                    { step: '1', title: 'Generate Payment Request', desc: 'Create a QR code with payment details (amount, recipient, message)' },
                                    { step: '2', title: 'Scan with Wallet', desc: 'Open your Solana wallet app and scan the QR code' },
                                    { step: '3', title: 'Review & Approve', desc: 'Check the payment details and approve the transaction' },
                                    { step: '4', title: 'Instant Confirmation', desc: 'Payment is processed and confirmed on the Solana blockchain' },
                                ].map(({ step, title, desc }) => (
                                    <div key={step} className="flex gap-4 items-start">
                                        <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">{step}</div>
                                        <div>
                                            <h4 className="font-semibold text-green-800 dark:text-green-200">{title}</h4>
                                            <p className="text-sm text-green-600 dark:text-green-400">{desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Use Cases in SubSync */}
                        <div className="shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900 rounded-lg overflow-hidden mx-auto w-full">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="flex items-center gap-2 text-2xl text-purple-700 dark:text-purple-200">
                                    <Icon name="home" className="w-6 h-6" /> Use Cases in SubSync
                                </h3>
                            </div>
                            <div className="p-6 bg-white dark:bg-purple-950 space-y-4">
                                <div className="grid gap-3">
                                    {[
                                        { title: 'Wallet Funding', desc: 'Add SOL to your wallet from external sources' },
                                        { title: 'Creator Subscriptions', desc: 'Subscribe to creators using any Solana wallet' },
                                        { title: 'Tips & Donations', desc: 'Support creators with one-time payments' },
                                        { title: 'Subscription Renewals', desc: 'Renew your subscriptions easily' },
                                    ].map(({ title, desc }) => (
                                        <div key={title} className="flex items-center gap-3 p-3 bg-white dark:bg-purple-950 rounded-lg">
                                            <Icon name="wallet" className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                            <div>
                                                <h4 className="font-semibold text-purple-800 dark:text-purple-200">{title}</h4>
                                                <p className="text-sm text-purple-600 dark:text-purple-400">{desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Supported Wallets */}
                        <div className="shadow-lg bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900 dark:to-red-900 rounded-lg overflow-hidden mx-auto w-full">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="flex items-center gap-2 text-2xl text-orange-700 dark:text-orange-200">
                                    <Icon name="user" className="w-6 h-6" /> Supported Wallets
                                </h3>
                            </div>
                            <div className="p-6 bg-white dark:bg-orange-950">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {['Phantom', 'Solflare', 'Backpack', 'Glow', 'Slope', 'Coinbase'].map((name) => (
                                        <div key={name} className="flex items-center gap-2 p-2 bg-white dark:bg-orange-950 rounded-lg">
                                            <Icon name="wallet" className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                            <span className="text-sm font-medium text-orange-800 dark:text-orange-200">{name}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-3 text-center">
                                    And many more Solana-compatible wallets!
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
