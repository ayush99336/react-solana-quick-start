import { useEffect, useState } from 'react'
import { useSolanaWallet } from '@web3auth/modal/react/solana'
import { PublicKey } from '@solana/web3.js'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import Icon from './Icon'
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
        const PASS_DISCRIMINATOR = new Uint8Array([40, 247, 140, 113, 56, 14, 57, 44]) // 8 bytes

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
            <div className="subscriptions-container">
                <div className="empty-state">
                    <div className="empty-icon">
                        <Icon name="user" className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3>No Subscriptions Yet</h3>
                    <p>Discover amazing creators and start your subscription journey</p>
                    <div className="empty-actions">
                        <Button onClick={loadMySubscriptions} className="refresh-premium-button">
                            <Icon name="refresh" className="mr-2" />
                            Check for Updates
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    const activeSubscriptions = subscriptions.filter(sub => sub.isActive)
    const expiredSubscriptions = subscriptions.filter(sub => !sub.isActive)

    return (
        <div className="subscriptions-container">
            {/* Header */}
            <div className="subscriptions-header">
                <div>
                    <h2 className="subscriptions-title">My Subscriptions</h2>
                    <div className="subscriptions-stats">
                        <span className="stat-badge active">
                            <Icon name="check" className="mr-2" />
                            {activeSubscriptions.length} Active
                        </span>
                        <span className="stat-badge expired">
                            <Icon name="error" className="mr-2" />
                            {expiredSubscriptions.length} Expired
                        </span>
                    </div>
                </div>
                <Button onClick={loadMySubscriptions} className="refresh-premium-button">
                    Refresh Subscriptions
                </Button>
            </div>

            {/* Active Subscriptions */}
            {activeSubscriptions.length > 0 && (
                <div className="subscription-section">
                    <div className="section-header">
                        <h3 className="section-title active">
                            <span className="status-indicator active"></span>
                            <Icon name="check" className="mr-2" />
                            Active Subscriptions
                        </h3>
                        <span className="section-count">{activeSubscriptions.length}</span>
                    </div>
                    <div className="subscription-grid">
                        {activeSubscriptions.map((sub, index) => (
                            <div key={index} className="subscription-card active">
                                <div className="card-header">
                                    <div className="tier-info">
                                        <h4 className="tier-name">{sub.tierName}</h4>
                                        <div className="creator-info">
                                            {sub.creatorOwner.slice(0, 8)}...{sub.creatorOwner.slice(-4)}
                                        </div>
                                    </div>
                                    <div className="status-badge active">
                                        <Icon name="check" className="mr-2" /> ACTIVE
                                    </div>
                                </div>
                                <div className="card-content">
                                    <div className="subscription-details">
                                        <div className="detail-item">
                                            <span className="detail-label">Price</span>
                                            <span className="detail-value">{sub.price}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Duration</span>
                                            <span className="detail-value">{sub.duration}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label"><Icon name="qr" className="mr-2" />Expires</span>
                                            <span className="detail-value expiry">{sub.expiryDate.toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Expired Subscriptions */}
            {expiredSubscriptions.length > 0 && (
                <div className="subscription-section">
                    <div className="section-header">
                        <h3 className="section-title expired">
                            <span className="status-indicator expired"></span>
                            Expired Subscriptions
                        </h3>
                        <span className="section-count">{expiredSubscriptions.length}</span>
                    </div>
                    <div className="subscription-grid">
                        {expiredSubscriptions.map((sub, index) => (
                            <div key={index} className="subscription-card expired">
                                <div className="card-header">
                                    <div className="tier-info">
                                        <h4 className="tier-name">{sub.tierName}</h4>
                                        <div className="creator-info">
                                            <Icon name="user" className="mr-2" />{sub.creatorOwner.slice(0, 8)}...{sub.creatorOwner.slice(-4)}
                                        </div>
                                    </div>
                                    <div className="status-badge expired">
                                        <Icon name="error" className="mr-2" />EXPIRED
                                    </div>
                                </div>
                                <div className="card-content">
                                    <div className="subscription-details">
                                        <div className="detail-item">
                                            <span className="detail-label"><Icon name="wallet" className="mr-2" />Price</span>
                                            <span className="detail-value">{sub.price}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label"><Icon name="refresh" className="mr-2" />Duration</span>
                                            <span className="detail-value">{sub.duration}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label"><Icon name="qr" className="mr-2" />Expired</span>
                                            <span className="detail-value expired-date">{sub.expiryDate.toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
