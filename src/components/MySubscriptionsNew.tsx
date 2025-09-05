import { useEffect, useState } from 'react'
import { useSolanaWallet } from '@web3auth/modal/react/solana'
import { PublicKey } from '@solana/web3.js'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { RX_PROGRAM_ADDRESS } from '../../codama/client/js/generated/programs'
import bs58 from 'bs58'

interface Subscription {
    tierName: string
    tierAddress: string
    creatorAddress: string
    creatorOwner: string
    expiryDate: Date
    isActive: boolean
    price: string
    duration: string
}

// Get all passes for the current user
async function getMyPasses(connection: any, wallet: string) {
    try {
        const PASS_DISCRIMINATOR = new Uint8Array([113, 97, 115, 115, 0, 0, 0, 0]) // "pass" + padding

        const passAccounts = await connection.getProgramAccounts(
            new PublicKey(RX_PROGRAM_ADDRESS),
            {
                filters: [
                    {
                        memcmp: {
                            offset: 0,
                            bytes: bs58.encode(PASS_DISCRIMINATOR)
                        }
                    },
                    {
                        memcmp: {
                            offset: 72, // offset to wallet field in Pass struct
                            bytes: wallet
                        }
                    }
                ]
            }
        )

        return passAccounts.map(({ pubkey, account }: any) => {
            const d = Buffer.from(account.data)

            const creator = new PublicKey(d.slice(8, 40))
            const tier = new PublicKey(d.slice(40, 72))
            const walletAddr = new PublicKey(d.slice(72, 104))
            const expiryTs = Number(d.readBigUInt64LE(104))

            return {
                passPda: pubkey.toString(),
                creator: creator.toString(),
                tier: tier.toString(),
                wallet: walletAddr.toString(),
                expiryTs
            }
        })
    } catch (error) {
        console.error('Error fetching passes:', error)
        return []
    }
}

// Get tier details
async function getTierDetails(connection: any, tierAddress: string) {
    try {
        const tierAccount = await connection.getAccountInfo(new PublicKey(tierAddress))
        if (!tierAccount) return null

        const d = Buffer.from(tierAccount.data)

        const creator = new PublicKey(d.slice(8, 40))
        const index = d.readUInt32LE(40)
        const price = Number(d.readBigUInt64LE(44))
        const tokenMint = new PublicKey(d.slice(52, 84))
        const durationSec = Number(d.readBigUInt64LE(84))

        let o = 92
        const nameLen = d.readUInt32LE(o); o += 4
        const name = d.slice(o, o + nameLen).toString("utf8"); o += nameLen

        const uriLen = d.readUInt32LE(o); o += 4
        const uri = d.slice(o, o + uriLen).toString("utf8"); o += uriLen

        const scholarshipRemaining = d.readUInt32LE(o)

        return {
            creator: creator.toString(),
            index,
            priceLamports: price,
            tokenMint: tokenMint.toString(),
            durationSec,
            name,
            uri,
            scholarshipRemaining
        }
    } catch (error) {
        console.error('Error fetching tier details:', error)
        return null
    }
}

// Get creator details
async function getCreatorDetails(connection: any, creatorAddress: string) {
    try {
        const creatorAccount = await connection.getAccountInfo(new PublicKey(creatorAddress))
        if (!creatorAccount) return null

        const d = Buffer.from(creatorAccount.data)
        const owner = new PublicKey(d.slice(8, 40))
        const payoutWallet = new PublicKey(d.slice(40, 72))

        return {
            owner: owner.toString(),
            payoutWallet: payoutWallet.toString()
        }
    } catch (error) {
        console.error('Error fetching creator details:', error)
        return null
    }
}

export function MySubscriptions() {
    const { accounts, connection } = useSolanaWallet()
    const wallet = accounts?.[0]
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
    const [loading, setLoading] = useState(true)

    const loadMySubscriptions = async () => {
        if (!wallet || !connection) return

        try {
            setLoading(true)

            // Get all passes for this wallet
            const myPasses = await getMyPasses(connection, wallet)

            const subscriptions: Subscription[] = []

            for (const pass of myPasses) {
                try {
                    // Get tier details
                    const tierDetails = await getTierDetails(connection, pass.tier)
                    if (!tierDetails) continue

                    // Get creator details
                    const creatorDetails = await getCreatorDetails(connection, pass.creator)
                    if (!creatorDetails) continue

                    const expiryDate = new Date(pass.expiryTs * 1000)
                    const isActive = expiryDate.getTime() > Date.now()

                    subscriptions.push({
                        tierName: tierDetails.name,
                        tierAddress: pass.tier,
                        creatorAddress: pass.creator,
                        creatorOwner: creatorDetails.owner,
                        expiryDate,
                        isActive,
                        price: `${tierDetails.priceLamports / 1000000000} SOL`,
                        duration: `${tierDetails.durationSec / 86400} days`
                    })
                } catch (error) {
                    console.error('Error processing pass:', pass, error)
                }
            }

            setSubscriptions(subscriptions)
        } catch (error) {
            console.error('Error loading subscriptions:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadMySubscriptions()
    }, [wallet, connection])

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center">Loading your subscriptions...</div>
                </CardContent>
            </Card>
        )
    }

    if (subscriptions.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>My Subscriptions</CardTitle>
                    <p className="text-sm text-muted">No active subscriptions. Discover creators to get started!</p>
                </CardHeader>
                <CardContent>
                    <Button onClick={loadMySubscriptions} variant="outline">
                        Refresh
                    </Button>
                </CardContent>
            </Card>
        )
    }

    const activeSubscriptions = subscriptions.filter(sub => sub.isActive)
    const expiredSubscriptions = subscriptions.filter(sub => !sub.isActive)

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">My Subscriptions ({subscriptions.length})</h2>
                <Button onClick={loadMySubscriptions} variant="outline" size="sm">
                    Refresh
                </Button>
            </div>

            {activeSubscriptions.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-green-600">Active Subscriptions ({activeSubscriptions.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4">
                            {activeSubscriptions.map((sub, index) => (
                                <div key={index} className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <div>
                                        <div className="font-semibold text-green-800 dark:text-green-200">{sub.tierName}</div>
                                        <div className="text-sm text-green-600 dark:text-green-400">
                                            Creator: {sub.creatorOwner.slice(0, 8)}...{sub.creatorOwner.slice(-4)}
                                        </div>
                                        <div className="text-sm text-green-600 dark:text-green-400">
                                            Expires: {sub.expiryDate.toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-green-800 dark:text-green-200">{sub.price}</div>
                                        <div className="text-xs text-green-600 dark:text-green-400">{sub.duration}</div>
                                        <div className="text-xs font-medium text-green-700 dark:text-green-300 mt-1">ACTIVE</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {expiredSubscriptions.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-orange-600">Expired Subscriptions ({expiredSubscriptions.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4">
                            {expiredSubscriptions.map((sub, index) => (
                                <div key={index} className="flex justify-between items-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                    <div>
                                        <div className="font-semibold text-orange-800 dark:text-orange-200">{sub.tierName}</div>
                                        <div className="text-sm text-orange-600 dark:text-orange-400">
                                            Creator: {sub.creatorOwner.slice(0, 8)}...{sub.creatorOwner.slice(-4)}
                                        </div>
                                        <div className="text-sm text-orange-600 dark:text-orange-400">
                                            Expired: {sub.expiryDate.toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-orange-800 dark:text-orange-200">{sub.price}</div>
                                        <div className="text-xs text-orange-600 dark:text-orange-400">{sub.duration}</div>
                                        <div className="text-xs font-medium text-orange-700 dark:text-orange-300 mt-1">EXPIRED</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
