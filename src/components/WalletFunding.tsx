import { useEffect, useState, useRef } from 'react'
import { useSolanaWallet } from '@web3auth/modal/react/solana'
import { PublicKey, Keypair } from '@solana/web3.js'
import { encodeURL, createQR, findReference } from '@solana/pay'
import BigNumber from 'bignumber.js'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'

interface WalletFundingProps {
    onFundingComplete?: (signature: string, amount: number) => void
}

export function WalletFunding({ onFundingComplete }: WalletFundingProps) {
    const { accounts, connection } = useSolanaWallet()
    const wallet = accounts?.[0]
    const [amount, setAmount] = useState<number>(1) // Default 1 SOL
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'generating' | 'pending' | 'confirmed' | 'error'>('idle')
    const [paymentUrl, setPaymentUrl] = useState<string>('')
    const [reference, setReference] = useState<PublicKey | null>(null)
    const [fundingSource, setFundingSource] = useState<string>('')
    const qrRef = useRef<HTMLDivElement>(null)

    // Monitor for payment completion
    useEffect(() => {
        if (!reference || !connection || paymentStatus !== 'pending') return

        const monitorPayment = async () => {
            try {
                console.log('🔍 Monitoring for funding payment...')
                const signatureInfo = await findReference(connection, reference, {
                    finality: 'confirmed'
                })

                console.log('✅ Funding payment confirmed!', signatureInfo.signature)
                setPaymentStatus('confirmed')

                if (onFundingComplete) {
                    onFundingComplete(signatureInfo.signature, amount)
                }
            } catch (error) {
                console.log('Payment not found yet, retrying...')
                // Continue monitoring
                setTimeout(monitorPayment, 2000)
            }
        }

        // Start monitoring after a short delay
        const timeout = setTimeout(monitorPayment, 1000)

        return () => clearTimeout(timeout)
    }, [reference, connection, paymentStatus, onFundingComplete, amount])

    const generateFundingRequest = async () => {
        if (!wallet || !connection) return

        try {
            setPaymentStatus('generating')
            console.log('💰 Creating wallet funding request...')

            // Generate a unique reference for this payment
            const newReference = Keypair.generate().publicKey
            setReference(newReference)

            // Create payment URL for funding wallet
            const urlParams = {
                recipient: new PublicKey(wallet),
                amount: new BigNumber(amount),
                reference: newReference,
                label: `Fund Wallet - ${amount} SOL`,
                message: `Add ${amount} SOL to your CreatorPass wallet`,
                memo: `FUND-${Date.now()}`
            }

            const url = encodeURL(urlParams)
            setPaymentUrl(url.toString())

            // Create QR code
            const qrCode = createQR(url, 350, 'transparent')

            // Clear previous QR code and append new one
            if (qrRef.current) {
                qrRef.current.innerHTML = ''
                qrCode.append(qrRef.current)
            }

            setPaymentStatus('pending')

            console.log('💰 Funding request created:', url.toString())
        } catch (error) {
            console.error('Error generating funding request:', error)
            setPaymentStatus('error')
        }
    }

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(paymentUrl)
            alert('Funding URL copied to clipboard!')
        } catch (error) {
            console.error('Failed to copy to clipboard:', error)
        }
    }

    const resetForm = () => {
        setPaymentStatus('idle')
        setPaymentUrl('')
        setReference(null)
        if (qrRef.current) {
            qrRef.current.innerHTML = ''
        }
    }

    if (!wallet) {
        return (
            <Card className="shadow-lg">
                <CardContent className="p-6 text-center">
                    <p className="text-muted">Please connect your wallet to fund it</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-2xl font-bold text-green-700 dark:text-green-200">
                    <span className="text-3xl">💰</span> Fund Your Wallet
                </CardTitle>
                <p className="text-sm text-muted">
                    Add SOL to your wallet using Solana Pay from any external wallet
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Amount Selection */}
                {paymentStatus === 'idle' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-green-700 dark:text-green-300 mb-2">
                                Amount to Fund (SOL)
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                                {[0.5, 1, 2, 5].map((presetAmount) => (
                                    <Button
                                        key={presetAmount}
                                        variant={amount === presetAmount ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setAmount(presetAmount)}
                                        className="text-sm"
                                    >
                                        {presetAmount} SOL
                                    </Button>
                                ))}
                            </div>
                            <input
                                type="number"
                                min="0.01"
                                max="100"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-green-200 dark:border-green-800 rounded-lg bg-white dark:bg-gray-900 text-center font-mono text-lg"
                                placeholder="Custom amount"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-green-700 dark:text-green-300 mb-2">
                                Funding Source (Optional)
                            </label>
                            <input
                                type="text"
                                value={fundingSource}
                                onChange={(e) => setFundingSource(e.target.value)}
                                className="w-full px-3 py-2 border border-green-200 dark:border-green-800 rounded-lg bg-white dark:bg-gray-900"
                                placeholder="e.g., External Wallet, Exchange, etc."
                            />
                        </div>

                        <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between">
                                <span className="font-semibold text-green-700 dark:text-green-300">Amount:</span>
                                <span className="font-mono text-lg">{amount} SOL</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-semibold text-green-700 dark:text-green-300">To Wallet:</span>
                                <span className="font-mono text-sm">{wallet.slice(0, 8)}...{wallet.slice(-4)}</span>
                            </div>
                            {fundingSource && (
                                <div className="flex justify-between">
                                    <span className="font-semibold text-green-700 dark:text-green-300">Source:</span>
                                    <span className="text-sm">{fundingSource}</span>
                                </div>
                            )}
                        </div>

                        <Button
                            onClick={generateFundingRequest}
                            disabled={amount <= 0}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-all"
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-lg">🚀</span>
                                <span>Generate Funding QR Code</span>
                            </div>
                        </Button>
                    </div>
                )}

                {/* Payment Status */}
                {paymentStatus !== 'idle' && (
                    <div className="text-center">
                        {paymentStatus === 'generating' && (
                            <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-300">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span>Generating funding request...</span>
                            </div>
                        )}

                        {paymentStatus === 'pending' && (
                            <div className="flex items-center justify-center gap-2 text-orange-600 dark:text-orange-300">
                                <div className="animate-pulse rounded-full h-4 w-4 bg-orange-600"></div>
                                <span>Waiting for funding payment...</span>
                            </div>
                        )}

                        {paymentStatus === 'confirmed' && (
                            <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-300">
                                <span className="text-2xl">✅</span>
                                <span className="font-semibold">Wallet Funded Successfully!</span>
                            </div>
                        )}

                        {paymentStatus === 'error' && (
                            <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-300">
                                <span className="text-2xl">❌</span>
                                <span>Error generating funding request</span>
                            </div>
                        )}
                    </div>
                )}

                {/* QR Code */}
                {paymentUrl && paymentStatus !== 'error' && (
                    <div className="flex flex-col items-center space-y-4">
                        <div className="bg-white p-4 rounded-lg shadow-md">
                            <div ref={qrRef} className="flex justify-center"></div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 w-full">
                            <Button
                                onClick={copyToClipboard}
                                variant="outline"
                                className="flex-1 flex items-center gap-2"
                            >
                                <span className="text-lg">📋</span>
                                Copy Funding URL
                            </Button>

                            <Button
                                onClick={resetForm}
                                variant="ghost"
                                className="flex-1 flex items-center gap-2"
                            >
                                <span className="text-lg">🔄</span>
                                New Request
                            </Button>
                        </div>
                    </div>
                )}

                {/* Success Actions */}
                {paymentStatus === 'confirmed' && (
                    <div className="space-y-3">
                        <Button
                            onClick={resetForm}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-all"
                        >
                            Fund Again
                        </Button>
                    </div>
                )}

                {/* Instructions */}
                <Card className="bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-900 dark:to-green-950 border-0 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <div className="text-blue-600 text-2xl">💡</div>
                            <div>
                                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">How to fund your wallet</h4>
                                <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal pl-4">
                                    <li>Choose the amount of SOL you want to add</li>
                                    <li>Generate the funding QR code</li>
                                    <li>Open your external wallet (Phantom, Solflare, etc.)</li>
                                    <li>Scan the QR code or paste the funding URL</li>
                                    <li>Approve the transaction to fund your CreatorPass wallet</li>
                                </ol>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                    ⚠️ This adds SOL from an external wallet to your current connected wallet
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </CardContent>
        </Card>
    )
}
