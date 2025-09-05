import { useEffect, useState } from 'react'
import { useSolanaWallet, useSignAndSendTransaction } from '@web3auth/modal/react/solana'
import { PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { findPassPda } from '../lib/pdas'
import { getSubscribeOrRenewInstructionDataEncoder } from '../../codama/client/js/generated/instructions'
import { RX_PROGRAM_ADDRESS } from '../../codama/client/js/generated/programs'
import { toWeb3Instruction } from '../lib/codamaAdapter'
import { Address, AccountRole } from 'gill'

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
        const CREATOR_DISCRIMINATOR = [237, 37, 233, 153, 165, 132, 54, 103] // 8 bytes

        const creatorAccounts = await connection.getProgramAccounts(
            new PublicKey(RX_PROGRAM_ADDRESS),
            {
                filters: [
                    {
                        memcmp: {
                            offset: 0,
                            bytes: Buffer.from(CREATOR_DISCRIMINATOR).toString('base64')
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
        const TIER_DISCRIMINATOR = [18, 149, 18, 34, 50, 201, 207, 55] // 8 bytes

        const tierAccounts = await connection.getProgramAccounts(
            new PublicKey(RX_PROGRAM_ADDRESS),
            {
                filters: [
                    {
                        memcmp: {
                            offset: 0,
                            bytes: Buffer.from(TIER_DISCRIMINATOR).toString('base64')
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
                        const tiers = tierData.map(tier => ({
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

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center">Loading creators globally...</div>
                </CardContent>
            </Card>
        )
    }

    if (creators.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>No Creators Found</CardTitle>
                    <p className="text-sm text-muted">
                        No creators with subscription tiers found on the network.
                    </p>
                </CardHeader>
                <CardContent>
                    <Button onClick={loadAllCreators} variant="outline">
                        Refresh
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Discover Creators ({creators.length} found)</h2>
                <Button onClick={loadAllCreators} variant="outline" size="sm">
                    Refresh
                </Button>
            </div>

            <div className="grid gap-6">
                {creators.map((creator) => (
                    <Card key={creator.address} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle>Creator {creator.owner.slice(0, 8)}...{creator.owner.slice(-4)}</CardTitle>
                            <p className="text-sm text-muted">{creator.tiers.length} subscription tier{creator.tiers.length !== 1 ? 's' : ''}</p>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3 mb-4">
                                {creator.tiers.map((tier) => (
                                    <div key={tier.index} className="flex justify-between items-center p-3 bg-[var(--background)] rounded-lg">
                                        <div>
                                            <div className="font-medium">{tier.name}</div>
                                            <div className="text-sm text-muted">{tier.duration}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-lg font-bold text-[var(--primary)]">{tier.price}</div>
                                            <Button
                                                size="sm"
                                                onClick={() => subscribeTo(creator, tier)}
                                                disabled={txLoading && subscribingTo === tier.address}
                                            >
                                                {txLoading && subscribingTo === tier.address ? 'Subscribing...' : 'Subscribe'}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {onSelectCreator && (
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => onSelectCreator(creator)}
                                >
                                    View Profile
                                </Button>
                            )}
                            {txError && (
                                <div className="text-red-500 text-sm mt-2">{txError.message}</div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
