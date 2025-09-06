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
        const tokenMint = '11111111111111111111111111111111' // Use default pubkey for SOL pricing
        const scholarshipRemaining = Number(form.get('scholarshipRemaining') as string) || 0

        const creatorPda = await findCreatorPda(owner)
        const tierPda = await findTierPda(creatorPda[0], idx)

        const data = getCreateTierInstructionDataEncoder().encode({
            index: idx,
            priceLamports: price,
            tokenMint: tokenMint as any,
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
            <div className="creator-setup-container">
                <div className="setup-card">
                    <div className="setup-header">
                        <div className="setup-icon">🎨</div>
                        <h1 className="setup-title">Welcome to CreatorPass!</h1>
                        <p className="setup-subtitle">
                            Transform your content into sustainable income<br />
                            Create subscription tiers and manage your community<br />
                            🔐 Secure Web3 payments with zero hassle
                        </p>
                    </div>
                    <form onSubmit={initCreator} className="setup-form">
                        <div className="form-group">
                            <Label htmlFor="payout" className="form-label">
                                Payout Wallet Address
                            </Label>
                            <Input
                                id="payout"
                                name="payout"
                                placeholder="Enter wallet address for payments"
                                defaultValue={owner || ''}
                                required
                                className="setup-input"
                            />
                            <p className="form-help">
                                💵 All subscription payments will be sent directly to this wallet
                            </p>
                        </div>
                        <Button type="submit" disabled={loading} className="setup-button">
                            {loading ? 'Setting up your creator account...' : 'Initialize Creator Account'}
                        </Button>
                    </form>
                    {error && (
                        <div className="setup-error">
                            ⚠️ {error.message}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="creator-dashboard-container">
            {/* Header */}
            <div className="creator-header">
                <div>
                    <h1 className="creator-title">🎨 Creator Dashboard</h1>
                    <p className="creator-subtitle">Manage your subscription tiers and grow your community</p>
                </div>
                <div className="creator-stats">
                    <div className="stat-item">
                        <span className="stat-value">{existingTiers.length}</span>
                        <span className="stat-label">Active Tiers</span>
                    </div>
                </div>
            </div>

            {/* Creator Info */}
            <div className="creator-info-section">
                <h2 className="section-title">📋 Account Overview</h2>
                <div className="info-grid">
                    <div className="info-card">
                        <div className="info-icon">💳</div>
                        <div className="info-content">
                            <h3>Payout Wallet</h3>
                            <div className="wallet-address">
                                {payoutWallet.slice(0, 8)}...{payoutWallet.slice(-8)}
                            </div>
                        </div>
                    </div>
                    <div className="info-card">
                        <div className="info-icon">📈</div>
                        <div className="info-content">
                            <h3>Total Tiers</h3>
                            <div className="tier-count">{existingTiers.length}/5</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Existing Tiers */}
            {existingTiers.length > 0 && (
                <div className="tiers-section">
                    <h2 className="section-title">🏆 Your Subscription Tiers</h2>
                    <div className="tiers-grid">
                        {existingTiers.map((tier) => (
                            <div key={tier.index} className="tier-card">
                                <div className="tier-header">
                                    <div className="tier-badge">Tier {tier.index}</div>
                                    <div className="tier-price">{tier.price}</div>
                                </div>
                                <div className="tier-content">
                                    <h3 className="tier-name">{tier.name}</h3>
                                    <div className="tier-details">
                                        <div className="tier-detail">
                                            <span className="detail-icon">⏰</span>
                                            <span>{tier.duration}</span>
                                        </div>
                                        <div className="tier-detail">
                                            <span className="detail-icon">🎁</span>
                                            <span>{tier.scholarshipRemaining} free passes</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Create New Tier */}
            <div className="create-tier-section">
                <h2 className="section-title">➕ Create New Subscription Tier</h2>
                <div className="create-tier-card">
                    <form onSubmit={createTier} className="tier-form">
                        <div className="form-row">
                            <div className="form-group">
                                <Label htmlFor="name" className="form-label">
                                    🏷️ Tier Name
                                </Label>
                                <Input id="name" name="name" placeholder="e.g., Premium Access" required className="form-input" />
                            </div>
                            <div className="form-group">
                                <Label htmlFor="priceSOL" className="form-label">
                                    💰 Price (SOL)
                                </Label>
                                <Input id="priceSOL" name="priceSOL" type="number" step="0.001" placeholder="0.1" required className="form-input" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <Label htmlFor="durationDays" className="form-label">
                                    📅 Duration (Days)
                                </Label>
                                <Input id="durationDays" name="durationDays" type="number" placeholder="30" required className="form-input" />
                            </div>
                            <div className="form-group">
                                <Label htmlFor="scholarshipRemaining" className="form-label">
                                    🎁 Free Passes
                                </Label>
                                <Input id="scholarshipRemaining" name="scholarshipRemaining" type="number" placeholder="0" className="form-input" />
                            </div>
                        </div>
                        <div className="form-group full-width">
                            <Label htmlFor="uri" className="form-label">
                                🔗 Content URL (optional)
                            </Label>
                            <Input id="uri" name="uri" placeholder="https://your-exclusive-content.com" className="form-input" />
                        </div>
                        <Button type="submit" disabled={loading} className="create-tier-button">
                            {loading ? '⏳ Creating tier...' : `🚀 Create Tier ${existingTiers.length}`}
                        </Button>
                    </form>
                    {error && (
                        <div className="form-error">
                            ⚠️ {error.message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
