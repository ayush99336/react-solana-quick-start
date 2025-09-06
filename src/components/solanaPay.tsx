import { useSolanaWallet } from "@web3auth/modal/react/solana";
import { useEffect, useState, useRef } from "react";
import { LAMPORTS_PER_SOL, Cluster, clusterApiUrl, Connection, PublicKey, Keypair } from '@solana/web3.js';
import { encodeURL, createQR, findReference } from '@solana/pay';
import BigNumber from 'bignumber.js';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'

export function SolanaPay() {
    const { accounts, connection } = useSolanaWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'confirmed'>('idle');
    const [paymentUrl, setPaymentUrl] = useState<string>('');
    const [reference, setReference] = useState<PublicKey | null>(null);
    const qrRef = useRef<HTMLDivElement>(null);

    // Monitor for payment completion
    useEffect(() => {
        if (!reference || !connection || paymentStatus !== 'pending') return;

        const monitorPayment = async () => {
            try {
                console.log('Monitoring for payment...');
                const signatureInfo = await findReference(connection, reference, {
                    finality: 'confirmed'
                });

                console.log('Payment confirmed!', signatureInfo.signature);
                setPaymentStatus('confirmed');
            } catch (error) {
                console.log('Payment not found yet, retrying...');
                // Continue monitoring
                setTimeout(monitorPayment, 2000);
            }
        };

        // Start monitoring after a short delay
        const timeout = setTimeout(monitorPayment, 1000);

        return () => clearTimeout(timeout);
    }, [reference, connection, paymentStatus]);

    const generateQrCode = async () => {
        if (!accounts || accounts.length === 0) {
            setError("No account connected");
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            setPaymentStatus('idle');

            const publicKey = new PublicKey(accounts[0]);
            const amount = new BigNumber(0.01);
            const newReference = new Keypair().publicKey;
            setReference(newReference);

            const label = 'Solana Pay Demo';
            const message = 'Test payment via Solana Pay';
            const memo = 'DEMO-PAY-001';

            const url = encodeURL({
                recipient: publicKey,
                amount,
                reference: newReference,
                label,
                message,
                memo
            });

            setPaymentUrl(url.toString());

            // Create QR code
            const qr = createQR(url, 300, 'transparent');

            // Clear previous QR code and append new one
            if (qrRef.current) {
                qrRef.current.innerHTML = '';
                qr.append(qrRef.current);
            }

            setPaymentStatus('pending');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate QR code');
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(paymentUrl);
            alert('Payment URL copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    };

    return (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-2xl font-bold text-purple-700 dark:text-purple-200">
                    <span className="text-3xl">💳</span> Solana Pay Demo
                </CardTitle>
                <p className="text-sm text-muted">
                    Generate a payment QR code and test Solana Pay functionality
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {!accounts || accounts.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-4xl mb-4">🔗</div>
                        <p className="text-muted">Please connect your wallet to use Solana Pay</p>
                    </div>
                ) : (
                    <>
                        {/* Payment Details */}
                        <div className="bg-white dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between">
                                <span className="font-semibold text-purple-700 dark:text-purple-300">Amount:</span>
                                <span className="font-mono">0.01 SOL</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-semibold text-purple-700 dark:text-purple-300">To:</span>
                                <span className="font-mono text-sm">{accounts[0].slice(0, 8)}...{accounts[0].slice(-4)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-semibold text-purple-700 dark:text-purple-300">Label:</span>
                                <span>Solana Pay Demo</span>
                            </div>
                        </div>

                        {/* Generate QR Code Button */}
                        <div className="text-center">
                            <Button
                                onClick={generateQrCode}
                                disabled={isLoading}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-all"
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Generating...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">📱</span>
                                        <span>Generate Payment QR</span>
                                    </div>
                                )}
                            </Button>
                        </div>

                        {/* Payment Status */}
                        {paymentStatus !== 'idle' && (
                            <div className="text-center">
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
                            </div>
                        )}

                        {/* QR Code Display */}
                        {paymentUrl && (
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
                                        onClick={generateQrCode}
                                        variant="ghost"
                                        className="flex-1 flex items-center gap-2"
                                        disabled={isLoading}
                                    >
                                        <span className="text-lg">🔄</span>
                                        Regenerate
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Error Display */}
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                    <span className="text-lg">❌</span>
                                    <span className="font-semibold">Error:</span>
                                    <span>{error}</span>
                                </div>
                            </div>
                        )}

                        {/* Instructions */}
                        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-950 border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="text-blue-600 text-2xl">💡</div>
                                    <div>
                                        <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">How to test</h4>
                                        <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal pl-4">
                                            <li>Click "Generate Payment QR" to create a payment request</li>
                                            <li>Open your Solana wallet (Phantom, Solflare, etc.)</li>
                                            <li>Scan the QR code or paste the payment URL</li>
                                            <li>Approve the 0.01 SOL transaction</li>
                                            <li>Watch the status update to "Payment Confirmed!"</li>
                                        </ol>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </CardContent>
        </Card>
    )
}