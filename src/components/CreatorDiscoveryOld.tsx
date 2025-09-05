import { useEffect, useState } from 'react'
import { useSolanaWallet, useSignAndSendTransaction } from '@web3auth/modal/react/solana'
import { PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { fetchMaybeCreatorW3J, fetchMaybeTierW3J } from '../lib/fetchers'
import { findCreatorPda, findTierPda, findPassPda } from '../lib/pdas'
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
    const [newCreatorAddress, setNewCreatorAddress] = useState('')

    const addCreatorManually = async () => {
        if (!newCreatorAddress.trim()) return

        // Validate it's a valid Solana address (basic check)
        if (newCreatorAddress.length < 32 || newCreatorAddress.length > 44) {
            alert('Please enter a valid Solana wallet address')
            return
        }

        // Add to discovered creators and trigger re-fetch
        saveDiscoveredCreator(newCreatorAddress.trim())
        setNewCreatorAddress('')
    }
    const [discoveredCreators, setDiscoveredCreators] = useState<string[]>([])
    const currentUser = accounts?.[0]

    // Load previously discovered creators from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('discoveredCreators')
        if (saved) {
            try {
                setDiscoveredCreators(JSON.parse(saved))
            } catch { }
        }
    }, [])

    // Save discovered creators to localStorage
    const saveDiscoveredCreator = (creatorAddress: string) => {
        const updated = [...new Set([...discoveredCreators, creatorAddress])]
        setDiscoveredCreators(updated)
        localStorage.setItem('discoveredCreators', JSON.stringify(updated))
    }

    // Registry of known creator wallet addresses
    // In a real app, this would come from an API, indexer, or on-chain registry
    const knownCreators = [
        'CenYq6bDRB7p73EjsPEpiYN7uveyPUTdXb2knPBrLhNZ', // Example creator address
        // Add any other known creator wallet addresses here
        // For testing, you can add specific wallet addresses of creators
        '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', // Another example creator
        ...discoveredCreators, // Previously discovered creators
    ]

    // For development/testing: also check the current user (useful for testing your own tiers)
    // In production, you might want to remove this or make it optional
    const candidateCreators = excludeCurrentUser
        ? knownCreators.filter(addr => addr !== currentUser)
        : [...knownCreators, ...(currentUser ? [currentUser] : [])]

    useEffect(() => {
        const loadCreators = async () => {
            if (!connection) return

            const foundCreators: Creator[] = []

            for (const creatorAddr of candidateCreators) {
                try {
                    const creatorPda = await findCreatorPda(creatorAddr as any)
                    const maybeCreator = await fetchMaybeCreatorW3J(connection, creatorPda[0] as any)

                    if (maybeCreator.exists) {
                        const tiers = []
                        // Check first 5 possible tiers
                        for (let i = 0; i < 5; i++) {
                            try {
                                const tierPda = await findTierPda(creatorPda[0] as any, i)
                                const maybeTier = await fetchMaybeTierW3J(connection, tierPda[0] as any)
                                if (maybeTier.exists) {
                                    tiers.push({
                                        index: i,
                                        name: maybeTier.data.name,
                                        price: `${Number(maybeTier.data.priceLamports) / 1000000000} SOL`,
                                        duration: `${Number(maybeTier.data.durationSec) / 86400} days`,
                                        address: tierPda[0] as any
                                    })
                                }
                            } catch { }
                        }

                        if (tiers.length > 0) {
                            const creator = {
                                address: creatorPda[0] as any,
                                owner: maybeCreator.data.owner as any,
                                payoutWallet: maybeCreator.data.payoutWallet as any,
                                tiers
                            }
                            foundCreators.push(creator)

                            // Save this creator for future discovery (if not already in known list)
                            if (!knownCreators.includes(creatorAddr)) {
                                saveDiscoveredCreator(creatorAddr)
                            }
                        }
                    }
                } catch { }
            }

            setCreators(foundCreators)
            setLoading(false)
        }

        loadCreators()
    }, [connection, accounts, excludeCurrentUser, currentUser, discoveredCreators])

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
            <div className="card">
                <h3>Discover Creators</h3>
                <div className="text-muted">Loading creators...</div>
            </div>
        )
    }

    if (creators.length === 0) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold mb-6">Discover Creators</h2>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>No Creators Found</CardTitle>
                        <p className="text-sm text-muted">
                            Add a creator's wallet address to discover their subscription tiers.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="creatorAddress">Creator Wallet Address</Label>
                            <div className="flex gap-2 mt-1">
                                <Input
                                    id="creatorAddress"
                                    placeholder="Enter creator's wallet address..."
                                    value={newCreatorAddress}
                                    onChange={(e) => setNewCreatorAddress(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addCreatorManually()}
                                />
                                <Button onClick={addCreatorManually} disabled={!newCreatorAddress.trim()}>
                                    Add Creator
                                </Button>
                            </div>
                        </div>
                        <div className="text-xs text-muted">
                            Tip: Ask creators to share their wallet address to discover their subscription tiers!
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-6">Discover Creators</h2>
            </div>

            <div className="grid gap-6">
                {creators.map((creator) => (
                    <Card key={creator.address} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle>Creator {creator.owner.slice(0, 8)}...</CardTitle>
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

            {/* Add New Creator Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Add More Creators</CardTitle>
                    <p className="text-sm text-muted">
                        Know another creator? Add their wallet address to discover their tiers!
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter creator's wallet address..."
                            value={newCreatorAddress}
                            onChange={(e) => setNewCreatorAddress(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addCreatorManually()}
                        />
                        <Button onClick={addCreatorManually} disabled={!newCreatorAddress.trim()}>
                            Add Creator
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
