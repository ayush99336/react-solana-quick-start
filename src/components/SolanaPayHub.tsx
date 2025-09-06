import { useState } from 'react'
import { useSolanaWallet } from '@web3auth/modal/react/solana'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { WalletFunding } from './WalletFunding'

export function SolanaPayHub() {
    const { accounts, connection } = useSolanaWallet()
    const wallet = accounts?.[0]
    const [activeTab, setActiveTab] = useState<'fund' | 'info'>('fund')

    if (!wallet) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 max-w-md">
                    <CardContent className="p-8 text-center">
                        <div className="text-6xl mb-4">🔗</div>
                        <h3 className="text-xl font-bold text-purple-700 dark:text-purple-200 mb-2">Connect Your Wallet</h3>
                        <p className="text-muted">Please connect your wallet to access Solana Pay features</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Solana Pay Hub
                </h1>
                <p className="text-lg text-muted max-w-2xl mx-auto">
                    Fund your wallet and make payments using Solana Pay - the universal QR code payment standard for Solana
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex justify-center">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex">
                    <Button
                        variant={activeTab === 'fund' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('fund')}
                        className="px-6 py-2"
                    >
                        💰 Fund Wallet
                    </Button>
                    <Button
                        variant={activeTab === 'info' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('info')}
                        className="px-6 py-2"
                    >
                        ℹ️ How It Works
                    </Button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="max-w-2xl mx-auto">
                {activeTab === 'fund' && (
                    <WalletFunding onFundingComplete={(signature, amount) => {
                        console.log(`Wallet funded with ${amount} SOL, signature: ${signature}`)
                    }} />
                )}

                {activeTab === 'info' && (
                    <div className="space-y-6">
                        {/* What is Solana Pay */}
                        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-2xl text-blue-700 dark:text-blue-200">
                                    <span className="text-3xl">💳</span> What is Solana Pay?
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-blue-700 dark:text-blue-300">
                                    Solana Pay is a universal standard for QR code payments on the Solana blockchain.
                                    It enables seamless transactions between any Solana wallets without requiring direct wallet connections.
                                </p>
                                <div className="grid gap-3">
                                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-blue-950 rounded-lg">
                                        <span className="text-2xl">🚀</span>
                                        <div>
                                            <h4 className="font-semibold text-blue-800 dark:text-blue-200">Universal</h4>
                                            <p className="text-sm text-blue-600 dark:text-blue-400">Works with any Solana wallet app</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-blue-950 rounded-lg">
                                        <span className="text-2xl">🔒</span>
                                        <div>
                                            <h4 className="font-semibold text-blue-800 dark:text-blue-200">Secure</h4>
                                            <p className="text-sm text-blue-600 dark:text-blue-400">No private key sharing required</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-blue-950 rounded-lg">
                                        <span className="text-2xl">📱</span>
                                        <div>
                                            <h4 className="font-semibold text-blue-800 dark:text-blue-200">Mobile-First</h4>
                                            <p className="text-sm text-blue-600 dark:text-blue-400">Optimized for mobile wallet experiences</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* How to Use */}
                        <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-2xl text-green-700 dark:text-green-200">
                                    <span className="text-3xl">📖</span> How to Use Solana Pay
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold text-green-800 dark:text-green-200">Generate Payment Request</h4>
                                            <p className="text-sm text-green-600 dark:text-green-400">Create a QR code with payment details (amount, recipient, message)</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold text-green-800 dark:text-green-200">Scan with Wallet</h4>
                                            <p className="text-sm text-green-600 dark:text-green-400">Open your Solana wallet app and scan the QR code</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold text-green-800 dark:text-green-200">Review & Approve</h4>
                                            <p className="text-sm text-green-600 dark:text-green-400">Check the payment details and approve the transaction</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">4</div>
                                        <div>
                                            <h4 className="font-semibold text-green-800 dark:text-green-200">Instant Confirmation</h4>
                                            <p className="text-sm text-green-600 dark:text-green-400">Payment is processed and confirmed on the Solana blockchain</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Where to Use */}
                        <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-2xl text-purple-700 dark:text-purple-200">
                                    <span className="text-3xl">🎯</span> Use Cases in CreatorPass
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-3">
                                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-purple-950 rounded-lg">
                                        <span className="text-2xl">💰</span>
                                        <div>
                                            <h4 className="font-semibold text-purple-800 dark:text-purple-200">Wallet Funding</h4>
                                            <p className="text-sm text-purple-600 dark:text-purple-400">Add SOL to your wallet from external sources</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-purple-950 rounded-lg">
                                        <span className="text-2xl">🎫</span>
                                        <div>
                                            <h4 className="font-semibold text-purple-800 dark:text-purple-200">Creator Subscriptions</h4>
                                            <p className="text-sm text-purple-600 dark:text-purple-400">Subscribe to creators using any Solana wallet</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-purple-950 rounded-lg">
                                        <span className="text-2xl">🎁</span>
                                        <div>
                                            <h4 className="font-semibold text-purple-800 dark:text-purple-200">Tips & Donations</h4>
                                            <p className="text-sm text-purple-600 dark:text-purple-400">Support creators with one-time payments</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-purple-950 rounded-lg">
                                        <span className="text-2xl">🔄</span>
                                        <div>
                                            <h4 className="font-semibold text-purple-800 dark:text-purple-200">Subscription Renewals</h4>
                                            <p className="text-sm text-purple-600 dark:text-purple-400">Renew your subscriptions easily</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Supported Wallets */}
                        <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900 dark:to-red-900">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-2xl text-orange-700 dark:text-orange-200">
                                    <span className="text-3xl">📱</span> Supported Wallets
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {[
                                        { name: 'Phantom', icon: '👻' },
                                        { name: 'Solflare', icon: '🔥' },
                                        { name: 'Backpack', icon: '🎒' },
                                        { name: 'Glow', icon: '✨' },
                                        { name: 'Slope', icon: '⛰️' },
                                        { name: 'Coinbase', icon: '🔵' },
                                    ].map((wallet) => (
                                        <div key={wallet.name} className="flex items-center gap-2 p-2 bg-white dark:bg-orange-950 rounded-lg">
                                            <span className="text-xl">{wallet.icon}</span>
                                            <span className="text-sm font-medium text-orange-800 dark:text-orange-200">{wallet.name}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-3 text-center">
                                    And many more Solana-compatible wallets!
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    )
}
