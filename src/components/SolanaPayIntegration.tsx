import { useEffect, useState, useRef } from 'react'
import { useSolanaWallet } from '@web3auth/modal/react/solana'
import { PublicKey, Keypair } from '@solana/web3.js'
import { encodeURL, createQR, findReference } from '@solana/pay'
import BigNumber from 'bignumber.js'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'

interface SolanaPayProps {
    recipient: string
    amount: number
    label: string
    message: string
    memo?: string
    splToken?: string
    onPaymentComplete?: (signature: string) => void
}

export function SolanaPayIntegration({
    recipient,
    amount,
    label,
    message,
    memo,
    splToken,
    onPaymentComplete
}: SolanaPayProps) {
    const { connection } = useSolanaWallet()
    const [qrCodeGenerated, setQrCodeGenerated] = useState(false)
    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'confirmed' | 'error' | 'generating'>('generating')
    const [paymentUrl, setPaymentUrl] = useState<string>('')
    const [reference, setReference] = useState<PublicKey | null>(null)
    const qrRef = useRef<HTMLDivElement>(null)

    // Generate QR code and start payment monitoring
    useEffect(() => {
        if (!connection) return

        generatePaymentRequest()
    }, [connection, recipient, amount, label, message, memo, splToken])

    // Monitor for payment completion
    useEffect(() => {
        if (!reference || !connection || paymentStatus !== 'pending') return

        const monitorPayment = async () => {
            try {
                console.log('🔍 Monitoring for payment...')
                const signatureInfo = await findReference(connection, reference, {
                    finality: 'confirmed'
                })

                console.log('✅ Payment confirmed!', signatureInfo.signature)
                setPaymentStatus('confirmed')

                if (onPaymentComplete) {
                    onPaymentComplete(signatureInfo.signature)
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
    }, [reference, connection, paymentStatus, onPaymentComplete])

    const generatePaymentRequest = async () => {
        try {
            setPaymentStatus('generating')
            console.log('🛍 Creating Solana Pay request...')

            // Generate a unique reference for this payment
            const newReference = Keypair.generate().publicKey
            setReference(newReference)

            // Create payment URL
            const urlParams: any = {
                recipient: new PublicKey(recipient),
                amount: new BigNumber(amount),
                reference: newReference,
                label,
                message,
            }

            if (memo) {
                urlParams.memo = memo
            }

            if (splToken) {
                urlParams.splToken = new PublicKey(splToken)
            }

            const url = encodeURL(urlParams)
            setPaymentUrl(url.toString())

            // Create QR code
            const qrCode = createQR(url, 400, 'transparent')

            // Clear previous QR code and append new one
            if (qrRef.current) {
                qrRef.current.innerHTML = ''
                qrCode.append(qrRef.current)
            }

            setQrCodeGenerated(true)
            setPaymentStatus('pending')

            console.log('💰 Payment request created:', url.toString())
        } catch (error) {
            console.error('Error generating payment request:', error)
            setPaymentStatus('error')
        }
    }

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(paymentUrl)
            alert('Payment URL copied to clipboard!')
        } catch (error) {
            console.error('Failed to copy to clipboard:', error)
        }
    }

    return (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-2xl font-bold text-purple-700 dark:text-purple-200">
                    <span className="text-3xl">💳</span> Solana Pay
                </CardTitle>
                <p className="text-sm text-muted">
                    Scan QR code or use the payment URL in any Solana wallet
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Payment Details */}
                <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                        <span className="font-semibold text-purple-700 dark:text-purple-300">Amount:</span>
                        <span className="font-mono">{amount} {splToken ? 'tokens' : 'SOL'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-semibold text-purple-700 dark:text-purple-300">To:</span>
                        <span className="font-mono text-sm">{recipient.slice(0, 8)}...{recipient.slice(-4)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-semibold text-purple-700 dark:text-purple-300">Label:</span>
                        <span>{label}</span>
                    </div>
                    {memo && (
                        <div className="flex justify-between">
                            <span className="font-semibold text-purple-700 dark:text-purple-300">Memo:</span>
                            <span>{memo}</span>
                        </div>
                    )}
                </div>

                {/* Payment Status */}
                <div className="text-center">
                    {paymentStatus === 'generating' && (
                        <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-300">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span>Generating payment request...</span>
                        </div>
                    )}

                    {paymentStatus === 'pending' && (
                        <div className="flex items-center justify-center gap-2 text-orange-600 dark:text-orange-300">
                            <div className="animate-pulse rounded-full h-4 w-4 bg-orange-600"></div>
                            <span>Waiting for payment...</span>
                        </div>
                    )}

                    {paymentStatus === 'confirmed' && (
                        <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-300">
                            <span className="text-2xl">✅</span>
                            <span className="font-semibold">Payment Confirmed!</span>
                        </div>
                    )}

                    {paymentStatus === 'error' && (
                        <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-300">
                            <span className="text-2xl">❌</span>
                            <span>Error generating payment request</span>
                        </div>
                    )}
                </div>

                {/* QR Code */}
                {qrCodeGenerated && paymentStatus !== 'error' && (
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
                                Copy Payment URL
                            </Button>

                            <Button
                                onClick={generatePaymentRequest}
                                variant="ghost"
                                className="flex-1 flex items-center gap-2"
                                disabled={paymentStatus === 'generating'}
                            >
                                <span className="text-lg">🔄</span>
                                Regenerate
                            </Button>
                        </div>
                    </div>
                )}

                {/* Instructions */}
                <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-950 border-0 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <div className="text-blue-600 text-2xl">💡</div>
                            <div>
                                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">How to pay</h4>
                                <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal pl-4">
                                    <li>Open your Solana wallet (Phantom, Solflare, etc.)</li>
                                    <li>Scan the QR code or paste the payment URL</li>
                                    <li>Review and approve the transaction</li>
                                    <li>Wait for confirmation on this page</li>
                                </ol>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </CardContent>
        </Card>
    )
}

// Example usage component
export function SolanaPayExample() {
    const { accounts } = useSolanaWallet()
    const wallet = accounts?.[0]

    const handlePaymentComplete = (signature: string) => {
        console.log('Payment completed with signature:', signature)
        alert(`Payment successful! Transaction: ${signature}`)
    }

    if (!wallet) {
        return (
            <Card className="shadow-lg">
                <CardContent className="p-6 text-center">
                    <p className="text-muted">Please connect your wallet to use Solana Pay</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-purple-700 dark:text-purple-200 tracking-tight">
                Solana Pay Demo
            </h2>

            <SolanaPayIntegration
                recipient={wallet} // Send to connected wallet for demo
                amount={0.1} // 0.1 SOL
                label="Subscription Payment"
                message="Monthly subscription to creator content"
                memo="SUB-2024-001"
                onPaymentComplete={handlePaymentComplete}
            />

            {/* SPL Token Example */}
            <SolanaPayIntegration
                recipient={wallet}
                amount={10} // 10 USDC
                label="USDC Payment"
                message="Payment in USDC stablecoin"
                memo="USDC-PAY-001"
                splToken="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" // USDC mint
                onPaymentComplete={handlePaymentComplete}
            />
        </div>
    )
}
