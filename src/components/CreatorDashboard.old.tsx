import { FormEvent, useMemo, useState, useEffect } from 'react'
import { useSolanaWallet, useSignAndSendTransaction } from '@web3auth/modal/react/solana'
import { Address, AccountRole } from 'gill'
import { PublicKey, SystemProgram, Transaction, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import { getInitCreatorInstructionDataEncoder, getCreateTierInstructionDataEncoder } from '../../codama/client/js/generated/instructions'
import { RX_PROGRAM_ADDRESS } from '../../codama/client/js/generated/programs'
import { toWeb3Instruction } from '../lib/codamaAdapter'
import { findCreatorPda, findTierPda } from '../lib/pdas'
import { fetchMaybeCreatorW3J, fetchMaybeTierW3J } from '../lib/fetchers'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'

type CreatorState = 'not-initialized' | 'initialized' | 'loading'

interface ExistingTier {
    index: number
    name: string
    price: string
    duration: string
    address: string
    scholarshipRemaining: number
}

export function CreatorDashboard() {
    const { accounts, connection } = useSolanaWallet()
    const { signAndSendTransaction, data: sig, error, loading } = useSignAndSendTransaction()
    const owner = accounts?.[0] as Address | undefined

    const [creatorState, setCreatorState] = useState<CreatorState>('loading')
    const [existingTiers, setExistingTiers] = useState<ExistingTier[]>([])
    const [payoutWallet, setPayoutWallet] = useState('')

    const ownerKey = useMemo(() => (owner ? new PublicKey(owner) : undefined), [owner])

    // Check creator initialization status and load existing tiers
    useEffect(() => {
        const checkCreatorStatus = async () => {
            if (!owner || !connection) return

            try {
                const creatorPda = await findCreatorPda(owner)
                const maybeCreator = await fetchMaybeCreatorW3J(connection, creatorPda[0] as any)

                if (maybeCreator.exists) {
                    setCreatorState('initialized')
                    setPayoutWallet(maybeCreator.data.payoutWallet as any)

                    // Load existing tiers
                    const tiers: ExistingTier[] = []
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
                                    address: tierPda[0] as any,
                                    scholarshipRemaining: maybeTier.data.scholarshipRemaining
                                })
                            }
                        } catch { }
                    }
                    setExistingTiers(tiers)
                } else {
                    setCreatorState('not-initialized')
                }
            } catch {
                setCreatorState('not-initialized')
            }
        }

        checkCreatorStatus()
    }, [owner, connection, sig])

    async function initCreator(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!owner || !ownerKey) return

        const form = new FormData(e.currentTarget)
        const payout = form.get('payout') as string
        const creatorPda = await findCreatorPda(owner)

        const data = getInitCreatorInstructionDataEncoder().encode({ payoutWallet: payout as any })
        const web3Ix = toWeb3Instruction({
            programAddress: RX_PROGRAM_ADDRESS,
            data,
            accounts: [
                { address: creatorPda[0] as any, role: AccountRole.WRITABLE },
                { address: owner as any, role: AccountRole.WRITABLE_SIGNER },
                { address: '11111111111111111111111111111111' as any, role: AccountRole.READONLY },
            ],
        })
        const { blockhash } = await connection!.getLatestBlockhash()
        const msg = new TransactionMessage({ payerKey: ownerKey, recentBlockhash: blockhash, instructions: [web3Ix] })
        const tx = new VersionedTransaction(msg.compileToV0Message())
        signAndSendTransaction(tx)
    }

    async function createTier(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!owner || !ownerKey) return

        const form = new FormData(e.currentTarget)
        const idx = existingTiers.length // Auto-assign next available index
        const name = form.get('name') as string
        const uri = form.get('uri') as string || `https://example.com/tier/${idx}`
        const priceSOL = Number(form.get('priceSOL') as string)
        const price = BigInt(Math.floor(priceSOL * 1000000000)) // Convert SOL to lamports
        const durationDays = Number(form.get('durationDays') as string)
        const duration = BigInt(durationDays * 86400) // Convert days to seconds
        const tokenMint = new PublicKey('So11111111111111111111111111111111111111112') // SOL mint
        const scholarshipRemaining = Number(form.get('scholarshipRemaining') as string) || 0

        const creatorPda = await findCreatorPda(owner)
        const tierPda = await findTierPda(creatorPda[0], idx)

        const data = getCreateTierInstructionDataEncoder().encode({
            index: idx,
            priceLamports: price,
            tokenMint: tokenMint.toBase58() as any,
            durationSec: duration,
            name,
            uri,
            scholarshipRemaining,
        })
        const web3Ix = toWeb3Instruction({
            programAddress: RX_PROGRAM_ADDRESS,
            data,
            accounts: [
                { address: creatorPda[0] as any, role: AccountRole.READONLY },
                { address: tierPda[0] as any, role: AccountRole.WRITABLE },
                { address: owner as any, role: AccountRole.WRITABLE_SIGNER },
                { address: '11111111111111111111111111111111' as any, role: AccountRole.READONLY },
            ],
        })
        const { blockhash } = await connection!.getLatestBlockhash()
        const msg = new TransactionMessage({ payerKey: ownerKey, recentBlockhash: blockhash, instructions: [web3Ix] })
        const tx = new VersionedTransaction(msg.compileToV0Message())
        signAndSendTransaction(tx)
    }

    if (creatorState === 'loading') {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center">Loading creator status...</div>
                </CardContent>
            </Card>
        )
    }

    if (creatorState === 'not-initialized') {
        return (
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Welcome to CreatorPass!</CardTitle>
                        <p className="text-muted">Set up your creator account to start offering subscription tiers.</p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={initCreator} className="space-y-4">
                            <div>
                                <Label htmlFor="payout">Payout Wallet Address</Label>
                                <Input
                                    id="payout"
                                    name="payout"
                                    placeholder="Enter wallet address for payments"
                                    defaultValue={owner || ''}
                                    required
                                />
                                <p className="text-xs text-muted mt-1">This is where subscription payments will be sent</p>
                            </div>
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? 'Setting up...' : 'Initialize Creator Account'}
                            </Button>
                        </form>
                        {error && <div className="text-red-500 text-sm mt-2">{error.message}</div>}
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Creator Dashboard</h1>
                <p className="text-muted">Manage your subscription tiers and earnings</p>
            </div>

            {/* Creator Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Account Info</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>Payout Wallet</Label>
                            <div className="text-sm font-mono bg-[var(--background)] p-2 rounded">
                                {payoutWallet.slice(0, 8)}...{payoutWallet.slice(-8)}
                            </div>
                        </div>
                        <div>
                            <Label>Active Tiers</Label>
                            <div className="text-2xl font-bold text-[var(--primary)]">{existingTiers.length}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Existing Tiers */}
            {existingTiers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Your Subscription Tiers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4">
                            {existingTiers.map((tier) => (
                                <div key={tier.index} className="flex justify-between items-center p-4 bg-[var(--background)] rounded-lg">
                                    <div>
                                        <div className="font-semibold">{tier.name}</div>
                                        <div className="text-sm text-muted">
                                            {tier.duration} • {tier.scholarshipRemaining} scholarships remaining
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-[var(--primary)]">{tier.price}</div>
                                        <div className="text-xs text-muted">Tier {tier.index}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Create New Tier */}
            <Card>
                <CardHeader>
                    <CardTitle>Create New Subscription Tier</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={createTier} className="grid gap-4 md:grid-cols-2">
                        <div>
                            <Label htmlFor="name">Tier Name</Label>
                            <Input id="name" name="name" placeholder="e.g., Premium Access" required />
                        </div>
                        <div>
                            <Label htmlFor="priceSOL">Price (SOL)</Label>
                            <Input id="priceSOL" name="priceSOL" type="number" step="0.001" placeholder="0.1" required />
                        </div>
                        <div>
                            <Label htmlFor="durationDays">Duration (Days)</Label>
                            <Input id="durationDays" name="durationDays" type="number" placeholder="30" required />
                        </div>
                        <div>
                            <Label htmlFor="scholarshipRemaining">Free Passes</Label>
                            <Input id="scholarshipRemaining" name="scholarshipRemaining" type="number" placeholder="0" />
                        </div>
                        <div className="md:col-span-2">
                            <Label htmlFor="uri">Content URL (optional)</Label>
                            <Input id="uri" name="uri" placeholder="https://your-content-url.com" />
                        </div>
                        <div className="md:col-span-2">
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? 'Creating...' : `Create Tier ${existingTiers.length}`}
                            </Button>
                        </div>
                    </form>
                    {error && <div className="text-red-500 text-sm mt-2">{error.message}</div>}
                </CardContent>
            </Card>
        </div>
    )
}

export function CreatorDashboard() {
    const { accounts, connection } = useSolanaWallet()
    const { signAndSendTransaction, data: sig, error, loading } = useSignAndSendTransaction()
    const owner = accounts?.[0] as Address | undefined
    const [createdTierSig, setCreatedTierSig] = useState<string>('')

    const ownerKey = useMemo(() => (owner ? new PublicKey(owner) : undefined), [owner])
    const [activeTab, setActiveTab] = useState<'status' | 'init' | 'create'>('status')

    async function initCreator(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!owner || !ownerKey) return
        const form = new FormData(e.currentTarget)
        const payout = form.get('payout') as string
        const creatorPda = await findCreatorPda(owner)

        const data = getInitCreatorInstructionDataEncoder().encode({ payoutWallet: payout as any })
        const web3Ix = toWeb3Instruction({
            programAddress: RX_PROGRAM_ADDRESS,
            data,
            accounts: [
                { address: creatorPda[0] as any, role: AccountRole.WRITABLE },
                { address: owner as any, role: AccountRole.WRITABLE_SIGNER },
                { address: '11111111111111111111111111111111' as any, role: AccountRole.READONLY },
            ],
        })
        const { blockhash } = await connection!.getLatestBlockhash()
        const msg = new TransactionMessage({ payerKey: ownerKey, recentBlockhash: blockhash, instructions: [web3Ix] })
        const tx = new VersionedTransaction(msg.compileToV0Message())
        signAndSendTransaction(tx)
    }

    async function createTier(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!owner || !ownerKey) return
        const form = new FormData(e.currentTarget)
        const idx = Number(form.get('index') as string)
        const name = form.get('name') as string
        const uri = form.get('uri') as string
        const price = BigInt(form.get('priceLamports') as string)
        const duration = BigInt(form.get('durationSec') as string)
        const tokenMint = new PublicKey(form.get('tokenMint') as string)
        const scholarshipRemaining = Number(form.get('scholarshipRemaining') as string)

        const creatorPda = await findCreatorPda(owner)
        const tierPda = await findTierPda(creatorPda[0], idx)

        const data = getCreateTierInstructionDataEncoder().encode({
            index: idx,
            priceLamports: price,
            tokenMint: tokenMint.toBase58() as any,
            durationSec: duration,
            name,
            uri,
            scholarshipRemaining,
        })
        const web3Ix = toWeb3Instruction({
            programAddress: RX_PROGRAM_ADDRESS,
            data,
            accounts: [
                { address: creatorPda[0] as any, role: AccountRole.READONLY },
                { address: tierPda[0] as any, role: AccountRole.WRITABLE },
                { address: owner as any, role: AccountRole.WRITABLE_SIGNER },
                { address: '11111111111111111111111111111111' as any, role: AccountRole.READONLY },
            ],
        })
        const { blockhash } = await connection!.getLatestBlockhash()
        const msg = new TransactionMessage({ payerKey: ownerKey, recentBlockhash: blockhash, instructions: [web3Ix] })
        const tx = new VersionedTransaction(msg.compileToV0Message())
        const res = await signAndSendTransaction(tx)
        if (typeof res === 'string') setCreatedTierSig(res)
    }

    return (
        <div className="card text-left">
            <h2 className="text-xl font-semibold mb-3">Creator</h2>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
                <button
                    className={`px-3 py-2 rounded-md border ${activeTab === 'status' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 border-gray-300'}`}
                    onClick={() => setActiveTab('status')}
                >
                    Status
                </button>
                <button
                    className={`px-3 py-2 rounded-md border ${activeTab === 'init' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 border-gray-300'}`}
                    onClick={() => setActiveTab('init')}
                >
                    Initialize
                </button>
                <button
                    className={`px-3 py-2 rounded-md border ${activeTab === 'create' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 border-gray-300'}`}
                    onClick={() => setActiveTab('create')}
                >
                    Create Tier
                </button>
            </div>

            {activeTab === 'status' && (
                <div className="mt-2">
                    <CreatorStatus />
                </div>
            )}

            {activeTab === 'init' && (
                <div className="mt-2">
                    <h3 className="text-lg font-medium mb-2 text-gray-600">Initialize Creator</h3>
                    <form onSubmit={initCreator} className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Payout Wallet (Pubkey)</label>
                            <input
                                name="payout"
                                placeholder="Payout Wallet (Pubkey)"
                                required
                                className="block w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
                            />
                        </div>
                        <button disabled={loading} type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60">
                            {loading ? 'Submitting…' : 'Init Creator'}
                        </button>
                    </form>
                </div>
            )}

            {activeTab === 'create' && (
                <div className="mt-2">
                    <h3 className="text-lg font-medium mb-2 text-gray-600">Create Tier</h3>
                    <form onSubmit={createTier} className="grid gap-3 md:grid-cols-2">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Tier Index</label>
                            <input name="index" type="number" placeholder="0" required className="block w-full rounded-md border border-gray-300 bg-white p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Name</label>
                            <input name="name" placeholder="Gold" required className="block w-full rounded-md border border-gray-300 bg-white p-2 text-sm" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">URI</label>
                            <input name="uri" placeholder="https://..." required className="block w-full rounded-md border border-gray-300 bg-white p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Price (lamports)</label>
                            <input name="priceLamports" type="number" placeholder="100000000" required className="block w-full rounded-md border border-gray-300 bg-white p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Duration (sec)</label>
                            <input name="durationSec" type="number" placeholder="2592000" required className="block w-full rounded-md border border-gray-300 bg-white p-2 text-sm" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Token Mint (0 for SOL)</label>
                            <input name="tokenMint" placeholder="11111111111111111111111111111111" defaultValue={PublicKey.default.toBase58()} required className="block w-full rounded-md border border-gray-300 bg-white p-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Scholarship Slots</label>
                            <input name="scholarshipRemaining" type="number" placeholder="10" required className="block w-full rounded-md border border-gray-300 bg-white p-2 text-sm" />
                        </div>
                        <div className="md:col-span-2">
                            <button disabled={loading} type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60">
                                {loading ? 'Submitting…' : 'Create Tier'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {sig && <div className="mt-2 text-sm">Sig: {sig}</div>}
            {createdTierSig && <div className="mt-2 text-sm">Created Tier Sig: {createdTierSig}</div>}
            {error && <div className="error">{error.message}</div>}
        </div>
    )
}
