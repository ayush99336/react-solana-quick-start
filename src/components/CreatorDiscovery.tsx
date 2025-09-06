import { useEffect, useState } from 'react'
import { useSolanaWallet, useSignAndSendTransaction } from '@web3auth/modal/react/solana'
import { PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import { Button } from './ui/button'
import { findPassPda } from '../lib/pdas'
import { getSubscribeOrRenewInstructionDataEncoder } from '../../codama/client/js/generated/instructions'
import { RX_PROGRAM_ADDRESS } from '../../codama/client/js/generated/programs'
import { toWeb3Instruction } from '../lib/codamaAdapter'
import { Address, AccountRole } from 'gill'
import { SolanaPaySubscription } from './SolanaPaySubscription'
import bs58 from 'bs58'

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

// Global creator discovery using getProgramAccounts
async function getAllCreators(connection: any) {
    try {
        const CREATOR_DISCRIMINATOR = new Uint8Array([237, 37, 233, 153, 165, 132, 54, 103]) // 8 bytes

        const creatorAccounts = await connection.getProgramAccounts(
            new PublicKey(RX_PROGRAM_ADDRESS),
            {
                filters: [
                    {
                        memcmp: {
                            offset: 0,
                            bytes: bs58.encode(CREATOR_DISCRIMINATOR)
                        }
                    }
                ]
            }
        )

        return creatorAccounts.map(({ pubkey, account }: any) => {
            const data = Buffer.from(account.data)
            const owner = new PublicKey(data.slice(8, 40))
            const payoutWallet = new PublicKey(data.slice(40, 72))

            return {
                creatorPda: pubkey.toString(),
                owner: owner.toString(),
                payoutWallet: payoutWallet.toString()
            }
        })
    } catch (error) {
        console.error('Error fetching creators:', error)
        return []
    }
}

async function getTiersForCreator(connection: any, creatorPda: string) {
    try {
        const TIER_DISCRIMINATOR = new Uint8Array([18, 149, 18, 34, 50, 201, 207, 55]) // 8 bytes

        const tierAccounts = await connection.getProgramAccounts(
            new PublicKey(RX_PROGRAM_ADDRESS),
            {
                filters: [
                    {
                        memcmp: {
                            offset: 0,
                            bytes: bs58.encode(TIER_DISCRIMINATOR)
                        }
                    },
                    {
                        memcmp: {
                            offset: 8,
                            bytes: creatorPda
                        }
                    }
                ]
            }
        )

        return tierAccounts.map(({ pubkey, account }: any) => {
            const d = Buffer.from(account.data)

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
                tierPda: pubkey.toString(),
                creator: creator.toString(),
                index,
                priceLamports: price,
                tokenMint: tokenMint.toString(),
                durationSec,
                name,
                uri,
                scholarshipRemaining
            }
        })
    } catch (error) {
        console.error('Error fetching tiers for creator:', error)
        return []
    }
}

export function CreatorDiscovery({ onSelectCreator, excludeCurrentUser = false }: {
    onSelectCreator?: (creator: Creator) => void
    excludeCurrentUser?: boolean
} = {}) {
    const { connection, accounts } = useSolanaWallet()
    const { signAndSendTransaction, loading: txLoading, error: txError } = useSignAndSendTransaction()
    const [creators, setCreators] = useState<Creator[]>([])
    const [loading, setLoading] = useState(true)
    const [subscribingTo, setSubscribingTo] = useState<string | null>(null)
    const [showSolanaPayModal, setShowSolanaPayModal] = useState(false)
    const [selectedSubscription, setSelectedSubscription] = useState<{ creator: Creator, tier: Creator['tiers'][0] } | null>(null)
    const currentUser = accounts?.[0]

    const loadAllCreators = async () => {
        if (!connection) return

        try {
            setLoading(true)

            // Get all creators globally
            const allCreatorData = await getAllCreators(connection)

            const foundCreators: Creator[] = []

            for (const creatorData of allCreatorData) {
                try {
                    // Get tiers for this creator
                    const tierData = await getTiersForCreator(connection, creatorData.creatorPda)

                    if (tierData.length > 0) {
                        const tiers = tierData.map((tier: any) => ({
                            index: tier.index,
                            name: tier.name,
                            price: `${tier.priceLamports / 1000000000} SOL`,
                            duration: `${tier.durationSec / 86400} days`,
                            address: tier.tierPda
                        }))

                        // Filter out current user if requested
                        if (excludeCurrentUser && creatorData.owner === currentUser) {
                            continue
                        }

                        foundCreators.push({
                            address: creatorData.creatorPda,
                            owner: creatorData.owner,
                            payoutWallet: creatorData.payoutWallet,
                            tiers
                        })
                    }
                } catch (error) {
                    console.error('Error loading tiers for creator:', creatorData.creatorPda, error)
                }
            }

            setCreators(foundCreators)
            setLoading(false)
        } catch (error) {
            console.error('Error loading creators:', error)
            setLoading(false)
        }
    }

    useEffect(() => {
        loadAllCreators()
    }, [connection, excludeCurrentUser, currentUser])

    const subscribeTo = async (creator: Creator, tier: typeof creator.tiers[0]) => {
        if (!currentUser || !connection) return

        setSubscribingTo(tier.address)
        try {
            const creatorPda = creator.address as Address
            const tierPda = tier.address as Address
            const payoutWallet = creator.payoutWallet as Address
            const passPda = await findPassPda(tierPda, currentUser as Address)

            const data = getSubscribeOrRenewInstructionDataEncoder().encode({})
            const web3Ix = toWeb3Instruction({
                programAddress: RX_PROGRAM_ADDRESS,
                data,
                accounts: [
                    { address: creatorPda, role: AccountRole.READONLY },
                    { address: tierPda, role: AccountRole.READONLY },
                    { address: payoutWallet, role: AccountRole.WRITABLE },
                    { address: passPda[0] as Address, role: AccountRole.WRITABLE },
                    { address: currentUser as Address, role: AccountRole.WRITABLE_SIGNER },
                    { address: '11111111111111111111111111111111' as Address, role: AccountRole.READONLY },
                ],
            })

            const { blockhash } = await connection.getLatestBlockhash()
            const msg = new TransactionMessage({
                payerKey: new PublicKey(currentUser),
                recentBlockhash: blockhash,
                instructions: [web3Ix]
            })
            const tx = new VersionedTransaction(msg.compileToV0Message())

            await signAndSendTransaction(tx)
        } catch (error) {
            console.error('Subscription failed:', error)
        } finally {
            setSubscribingTo(null)
        }
    }

    const subscribeWithSolanaPay = (creator: Creator, tier: typeof creator.tiers[0]) => {
        setSelectedSubscription({ creator, tier })
        setShowSolanaPayModal(true)
    }

    const handleSolanaPayComplete = (signature: string) => {
        console.log('Solana Pay subscription completed:', signature)
        setShowSolanaPayModal(false)
        setSelectedSubscription(null)
        // Optionally refresh the creators list or show success message
        alert(`Subscription payment confirmed! Transaction: ${signature.slice(0, 8)}...${signature.slice(-4)}`)
    }

    const handleSolanaPayCancel = () => {
        setShowSolanaPayModal(false)
        setSelectedSubscription(null)
    }

    if (loading) {
        return (
            <div className="subscriptions-container">
                <div className="empty-state">
                    <div className="empty-icon">🔍</div>
                    <h3>Discovering Creators</h3>
                    <p>Scanning the network for amazing creators...</p>
                </div>
            </div>
        )
    }

    if (creators.length === 0) {
        return (
            <div className="subscriptions-container">
                <div className="empty-state">
                    <div className="empty-icon">🎨</div>
                    <h3>No Creators Found</h3>
                    <p>No creators with subscription tiers found on the network.</p>
                    <div className="empty-actions">
                        <Button onClick={loadAllCreators} className="refresh-premium-button">
                            🔄 Refresh Creators
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="subscriptions-container">
            {/* Header */}
            <div className="subscriptions-header">
                <div>
                    <h2 className="subscriptions-title">🔍 Discover Creators</h2>
                    <div className="subscriptions-stats">
                        <span className="stat-badge active">
                            🎨 {creators.length} Creator{creators.length !== 1 ? 's' : ''} Found
                        </span>
                    </div>
                </div>
                <Button onClick={loadAllCreators} className="refresh-premium-button">
                    🔄 Refresh Creators
                </Button>
            </div>

            {/* Creators Grid */}
            <div className="subscription-section">
                <div className="section-header">
                    <h3 className="section-title active">
                        <span className="status-indicator active"></span>
                        Available Creators
                    </h3>
                    <span className="section-count">{creators.length}</span>
                </div>
                <div className="subscription-grid">
                    {creators.map((creator) => (
                        <div key={creator.address} className="creator-card">
                            <div className="card-header">
                                <div className="tier-info">
                                    <h4 className="tier-name">Creator {creator.owner.slice(0, 8)}...{creator.owner.slice(-4)}</h4>
                                    <div className="creator-info">
                                        🎨 {creator.tiers.length} subscription tier{creator.tiers.length !== 1 ? 's' : ''}
                                    </div>
                                </div>
                                <div className="status-badge active">
                                    ✅ AVAILABLE
                                </div>
                            </div>
                            <div className="card-content">
                                <div className="tiers-container">
                                    {creator.tiers.map((tier) => (
                                        <div key={tier.index} className="tier-card">
                                            <div className="tier-details">
                                                <div className="tier-header">
                                                    <h5 className="tier-title">{tier.name}</h5>
                                                    <span className="tier-price">{tier.price}</span>
                                                </div>
                                                <div className="tier-info-row">
                                                    <span className="tier-duration">⏰ {tier.duration}</span>
                                                </div>
                                            </div>
                                            <div className="tier-actions">
                                                <Button
                                                    size="sm"
                                                    onClick={() => subscribeTo(creator, tier)}
                                                    disabled={txLoading && subscribingTo === tier.address}
                                                    variant="default"
                                                    className="subscribe-button primary"
                                                >
                                                    {txLoading && subscribingTo === tier.address ? '⏳ Subscribing...' : '⚡ Quick Subscribe'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => subscribeWithSolanaPay(creator, tier)}
                                                    variant="outline"
                                                    className="subscribe-button secondary"
                                                >
                                                    💳 Solana Pay
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {onSelectCreator && (
                                    <div className="creator-actions">
                                        <Button
                                            variant="outline"
                                            className="view-profile-button"
                                            onClick={() => onSelectCreator(creator)}
                                        >
                                            👤 View Profile
                                        </Button>
                                    </div>
                                )}
                                {txError && (
                                    <div className="error-message">
                                        ⚠️ {txError.message}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Solana Pay Modal */}
            {showSolanaPayModal && selectedSubscription && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <SolanaPaySubscription
                            creator={selectedSubscription.creator}
                            tier={selectedSubscription.tier}
                            onPaymentComplete={handleSolanaPayComplete}
                            onCancel={handleSolanaPayCancel}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
