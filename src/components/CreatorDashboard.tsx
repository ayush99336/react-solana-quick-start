import { FormEvent, useMemo, useState } from 'react'
import { useSolanaWallet, useSignAndSendTransaction } from '@web3auth/modal/react/solana'
import { Address, AccountRole } from 'gill'
import { PublicKey, SystemProgram, Transaction, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import { getInitCreatorInstructionDataEncoder, getCreateTierInstructionDataEncoder } from '../../codama/client/js/generated/instructions'
import { RX_PROGRAM_ADDRESS } from '../../codama/client/js/generated/programs'
import { toWeb3Instruction } from '../lib/codamaAdapter'
import { findCreatorPda, findTierPda } from '../lib/pdas'
import { CreatorStatus } from './CreatorStatus'

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
