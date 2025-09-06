import { useEffect, useState, useRef } from 'react'
import { useSolanaWallet } from '@web3auth/modal/react/solana'
import { PublicKey, Keypair } from '@solana/web3.js'
import { encodeURL, createQR, findReference } from '@solana/pay'
import BigNumber from 'bignumber.js'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'

interface Creator {
    address: string
    owner: string
    payoutWallet: string
    tiers: Array<{
        index: number
        name: string
        price: string
        duration: string
        address: string
    }>
}

interface SolanaPaySubscriptionProps {
    creator: Creator
    tier: Creator['tiers'][0]
    onPaymentComplete?: (signature: string) => void
    onCancel?: () => void
}

export function SolanaPaySubscription({
    creator,
    tier,
    onPaymentComplete,
    onCancel
}: SolanaPaySubscriptionProps) {
    const { accounts, connection } = useSolanaWallet()
    const wallet = accounts?.[0]
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'generating' | 'ready' | 'monitoring' | 'confirmed' | 'error'>('idle')
    const [paymentUrl, setPaymentUrl] = useState<string>('')
    const [reference, setReference] = useState<PublicKey | null>(null)
    const [errorMessage, setErrorMessage] = useState<string>('')
    const qrRef = useRef<HTMLDivElement>(null)
    const qrMonitoringRef = useRef<HTMLDivElement>(null)
    const monitoringRef = useRef<boolean>(false)

    // Parse price from string (e.g., "0.1 SOL" -> 0.1)
    const priceValue = parseFloat(tier.price.replace(' SOL', ''))

    // Generate payment request when component mounts
    useEffect(() => {
        generateSubscriptionPayment()
    }, [])

    // Monitor for payment completion
    useEffect(() => {
        if (!reference || !connection || paymentStatus !== 'monitoring' || monitoringRef.current) return

        monitoringRef.current = true

        const monitorPayment = async () => {
            let attempts = 0
            const maxAttempts = 30 // 1 minute of monitoring (2s intervals)

            const checkPayment = async () => {
                if (!monitoringRef.current) return

                try {
                    console.log(`🔍 Monitoring payment attempt ${attempts + 1}/${maxAttempts}`)
                    const signatureInfo = await findReference(connection, reference, {
                        finality: 'confirmed'
                    })

                    console.log('✅ Subscription payment confirmed!', signatureInfo.signature)
                    setPaymentStatus('confirmed')
                    monitoringRef.current = false

                    if (onPaymentComplete) {
                        onPaymentComplete(signatureInfo.signature)
                    }
                } catch (error) {
                    attempts++
                    if (attempts < maxAttempts && monitoringRef.current) {
                        console.log(`Payment not found yet, retrying... (${attempts}/${maxAttempts})`)
                        setTimeout(checkPayment, 2000)
                    } else {
                        console.log('Payment monitoring timeout')
                        monitoringRef.current = false
                    }
                }
            }

            // Start monitoring
            setTimeout(checkPayment, 1000)
        }

        monitorPayment()

        // Cleanup function
        return () => {
            monitoringRef.current = false
        }
    }, [reference, connection, paymentStatus, onPaymentComplete])

    const generateSubscriptionPayment = async () => {
        console.log('🔧 Checking wallet connection...', { wallet, connection: !!connection })

        if (!wallet || !connection) {
            setErrorMessage(`Wallet not connected - wallet: ${!!wallet}, connection: ${!!connection}`)
            setPaymentStatus('error')
            return
        }

        try {
            setPaymentStatus('generating')
            setErrorMessage('')
            console.log('🎯 Creating subscription payment request...')
            console.log('Creator payout wallet:', creator.payoutWallet)
            console.log('Tier price:', tier.price, '-> parsed:', priceValue)

            // Generate a unique reference for this payment
            const newReference = Keypair.generate().publicKey
            setReference(newReference)

            // Create payment URL for subscription
            const urlParams = {
                recipient: new PublicKey(creator.payoutWallet),
                amount: new BigNumber(priceValue),
                reference: newReference,
                label: `Subscribe to ${tier.name}`,
                message: `${tier.duration} subscription to creator`,
                memo: `SUB-${tier.index}-${Date.now()}`
            }

            console.log('🔗 URL params:', urlParams)
            const url = encodeURL(urlParams)
            setPaymentUrl(url.toString())
            console.log('🔗 Generated payment URL:', url.toString())

            // Wait a bit for DOM to be ready, then create QR code
            setTimeout(() => {
                if (qrRef.current) {
                    try {
                        qrRef.current.innerHTML = ''
                        const qrCode = createQR(url, 280, 'white')
                        qrCode.append(qrRef.current)
                        console.log('✅ QR code generated successfully')
                    } catch (qrError) {
                        console.error('QR code generation failed:', qrError)
                        setErrorMessage('Failed to generate QR code: ' + (qrError instanceof Error ? qrError.message : 'Unknown error'))
                        setPaymentStatus('error')
                        return
                    }
                }
            }, 100)

            setPaymentStatus('ready')
            console.log('🎯 Subscription payment request created successfully')
        } catch (error) {
            console.error('Error generating subscription payment:', error)
            setErrorMessage(error instanceof Error ? error.message : 'Failed to generate payment request')
            setPaymentStatus('error')
        }
    }

    const startMonitoring = () => {
        setPaymentStatus('monitoring')
        // Regenerate QR code to ensure it's visible
        regenerateQRCode()
    }

    const regenerateQRCode = () => {
        if (!paymentUrl) return

        try {
            const url = new URL(paymentUrl)
            const qrCode = createQR(url, 280, 'white')

            // Clear and populate the current ref based on status
            const currentRef = paymentStatus === 'monitoring' ? qrMonitoringRef : qrRef
            if (currentRef.current) {
                currentRef.current.innerHTML = ''
                qrCode.append(currentRef.current)
                console.log('✅ QR code regenerated for', paymentStatus, 'state')
            }
        } catch (error) {
            console.error('Failed to regenerate QR code:', error)
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
        <Card className="shadow-xl border-0 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-xl font-bold text-purple-700 dark:text-purple-200">
                        <span className="text-2xl">🎫</span> Subscribe via Solana Pay
                    </CardTitle>
                    {onCancel && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onCancel}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </Button>
                    )}
                </div>
                <p className="text-sm text-purple-600 dark:text-purple-300">
                    Scan QR code with any Solana wallet to subscribe
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Subscription Details */}
                <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-purple-700 dark:text-purple-300">Tier:</span>
                        <span className="font-bold">{tier.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-purple-700 dark:text-purple-300">Duration:</span>
                        <span>{tier.duration}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-purple-700 dark:text-purple-300">Price:</span>
                        <span className="text-xl font-bold text-green-600 dark:text-green-400">{tier.price}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-purple-700 dark:text-purple-300">Creator:</span>
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {creator.owner.slice(0, 8)}...{creator.owner.slice(-4)}
                        </span>
                    </div>
                </div>

                {/* Status Display */}
                <div className="text-center">
                    {paymentStatus === 'idle' && (
                        <div className="text-gray-500">
                            <div className="text-lg">⏳</div>
                            <p>Initializing...</p>
                        </div>
                    )}

                    {paymentStatus === 'generating' && (
                        <div className="text-blue-600">
                            <div className="text-lg animate-spin">⚙️</div>
                            <p>Generating payment request...</p>
                        </div>
                    )}

                    {paymentStatus === 'error' && (
                        <div className="text-red-600">
                            <div className="text-lg">❌</div>
                            <p>Error: {errorMessage}</p>
                            <Button
                                onClick={generateSubscriptionPayment}
                                className="mt-2"
                                size="sm"
                            >
                                Retry
                            </Button>
                        </div>
                    )}

                    {paymentStatus === 'ready' && (
                        <div className="space-y-4">
                            <div className="text-green-600">
                                <div className="text-lg">✅</div>
                                <p>QR Code Ready - Scan to Pay</p>
                            </div>

                            {/* QR Code */}
                            <div className="flex justify-center">
                                <div
                                    ref={qrRef}
                                    className="bg-white p-6 rounded-xl shadow-lg border-2 border-purple-200 min-h-[300px] min-w-[300px] flex items-center justify-center"
                                    style={{ backgroundColor: '#ffffff' }}
                                />
                            </div>

                            {/* Fallback if QR doesn't show */}
                            <div className="space-y-2">
                                <Button
                                    onClick={() => regenerateQRCode()}
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                >
                                    🔄 Regenerate QR Code
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <Button
                                    onClick={startMonitoring}
                                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                                >
                                    🔍 Start Payment Monitoring
                                </Button>

                                <Button
                                    onClick={copyToClipboard}
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                >
                                    📋 Copy Payment URL
                                </Button>
                            </div>
                        </div>
                    )}

                    {paymentStatus === 'monitoring' && (
                        <div className="text-blue-600 space-y-4">
                            <div>
                                <div className="text-lg animate-pulse">🔍</div>
                                <p>Monitoring for payment...</p>
                                <p className="text-xs text-gray-500 mt-1">Scan the QR code with your Solana wallet</p>
                            </div>

                            {/* QR Code for monitoring state */}
                            <div className="flex justify-center">
                                <div
                                    ref={qrMonitoringRef}
                                    className="bg-white p-6 rounded-xl shadow-lg border-2 border-blue-200 min-h-[300px] min-w-[300px] flex items-center justify-center"
                                    style={{ backgroundColor: '#ffffff' }}
                                >
                                    {/* QR will be inserted here */}
                                </div>
                            </div>
                        </div>
                    )}

                    {paymentStatus === 'confirmed' && (
                        <div className="text-green-600">
                            <div className="text-lg">🎉</div>
                            <p>Payment Confirmed!</p>
                            <p className="text-xs text-gray-500 mt-1">Subscription activated successfully</p>
                        </div>
                    )}
                </div>

                {/* Instructions */}
                {(paymentStatus === 'ready' || paymentStatus === 'monitoring') && (
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">How to pay:</h4>
                        <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                            <li>1. Open your Solana wallet app (Phantom, Solflare, etc.)</li>
                            <li>2. Scan the QR code above</li>
                            <li>3. Review and approve the payment</li>
                            <li>4. Wait for confirmation</li>
                        </ol>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
