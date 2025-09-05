import { useEffect, useState } from 'react'
import { useSolanaWallet } from '@web3auth/modal/react/solana'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { fetchMaybePassW3J } from '../lib/fetchers'
import { findPassPda } from '../lib/pdas'

interface Subscription {
    tierName: string
    tierAddress: string
    expiryDate: Date
    isActive: boolean
}

export function MySubscriptions() {
    const { accounts, connection } = useSolanaWallet()
    const wallet = accounts?.[0]
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
    const [loading, setLoading] = useState(true)

    // In a real app, you'd have a way to track which tiers a user has subscribed to
    // For demo, we'll check against some known tier addresses
    const knownTiers = [
        { name: 'Basic', address: 'tier_address_1' },
        { name: 'Premium', address: 'tier_address_2' },
        // Add more as needed
    ]

    useEffect(() => {
        const loadSubscriptions = async () => {
            if (!wallet || !connection) return

            const activeSubscriptions: Subscription[] = []

            for (const tier of knownTiers) {
                try {
                    const passPda = await findPassPda(tier.address as any, wallet as any)
                    const maybePass = await fetchMaybePassW3J(connection, passPda[0] as any)

                    if (maybePass.exists) {
                        const expiryTs = Number(maybePass.data.expiryTs)
                        const expiryDate = new Date(expiryTs * 1000)
                        const isActive = expiryDate.getTime() > Date.now()

                        activeSubscriptions.push({
                            tierName: tier.name,
                            tierAddress: tier.address,
                            expiryDate,
                            isActive
                        })
                    }
                } catch { }
            }

            setSubscriptions(activeSubscriptions)
            setLoading(false)
        }

        loadSubscriptions()
    }, [wallet, connection])

    if (!wallet) {
        return (
            <div className="card">
                <h3>My Subscriptions</h3>
                <div className="text-muted">Connect your wallet to view subscriptions</div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="card">
                <h3>My Subscriptions</h3>
                <div className="text-muted">Loading subscriptions...</div>
            </div>
        )
    }

    if (subscriptions.length === 0) {
        return (
            <div className="card">
                <h3>My Subscriptions</h3>
                <div className="text-muted">No active subscriptions. Discover creators to get started!</div>
            </div>
        )
    }

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">My Subscriptions</h2>
            <div className="grid gap-4">
                {subscriptions.map((sub, idx) => (
                    <Card key={idx} className={sub.isActive ? 'border-[var(--primary)]' : 'border-red-500'}>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>{sub.tierName}</span>
                                <span className={`text-sm px-2 py-1 rounded ${sub.isActive ? 'bg-[var(--primary)] text-black' : 'bg-red-500 text-white'}`}>
                                    {sub.isActive ? 'Active' : 'Expired'}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted mb-3">
                                {sub.isActive ? 'Expires' : 'Expired'}: {sub.expiryDate.toLocaleDateString()}
                            </div>
                            {!sub.isActive && (
                                <Button variant="outline" className="w-full">
                                    Renew Subscription
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
