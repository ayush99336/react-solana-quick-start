import { FormEvent, useMemo } from 'react'
import { useSolanaWallet, useSignAndSendTransaction } from '@web3auth/modal/react/solana'
import { AccountRole } from 'gill'
import { PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import { getSubscribeOrRenewInstructionDataEncoder, getGrantScholarshipInstructionDataEncoder } from '../../codama/client/js/generated/instructions'
import { RX_PROGRAM_ADDRESS } from '../../codama/client/js/generated/programs'
import { toWeb3Instruction } from '../lib/codamaAdapter'
import { findCreatorPda, findPassPda } from '../lib/pdas'

export function FanPage() {
    const { accounts, connection } = useSolanaWallet()
    const { signAndSendTransaction, data: sig, error, loading } = useSignAndSendTransaction()
    const wallet = accounts?.[0]
    const walletKey = useMemo(() => (wallet ? new PublicKey(wallet) : undefined), [wallet])

    async function subscribeOrRenew(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!wallet || !walletKey) return
        const form = new FormData(e.currentTarget)
        const creator = new PublicKey(form.get('creator') as string)
        const tier = new PublicKey(form.get('tier') as string)
        const payout = new PublicKey(form.get('payout') as string)
        const lamports = Number(form.get('lamports') as string)
        const passPda = await findPassPda(tier.toBase58() as any, wallet as any)

        const data = getSubscribeOrRenewInstructionDataEncoder().encode({})
        const ix = toWeb3Instruction({
            programAddress: RX_PROGRAM_ADDRESS,
            data,
            accounts: [
                { address: creator.toBase58() as any, role: AccountRole.READONLY },
                { address: tier.toBase58() as any, role: AccountRole.READONLY },
                { address: payout.toBase58() as any, role: AccountRole.WRITABLE },
                { address: passPda[0] as any, role: AccountRole.WRITABLE },
                { address: wallet as any, role: AccountRole.WRITABLE_SIGNER },
                { address: '11111111111111111111111111111111' as any, role: AccountRole.READONLY },
            ],
        })

        const { blockhash } = await connection!.getLatestBlockhash()
        const payIx = SystemProgram.transfer({ fromPubkey: walletKey, toPubkey: payout, lamports })
        const msg = new TransactionMessage({ payerKey: walletKey, recentBlockhash: blockhash, instructions: [payIx, ix] })
        const tx = new VersionedTransaction(msg.compileToV0Message())
        await signAndSendTransaction(tx)
    }

    async function grantScholarship(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!wallet || !walletKey) return
        const form = new FormData(e.currentTarget)
        const beneficiary = new PublicKey(form.get('beneficiary') as string)
        const tier = new PublicKey(form.get('tier') as string)
        const pass = new PublicKey(form.get('pass') as string)

        const ownerCreator = await findCreatorPda(wallet as any)
        const data = getGrantScholarshipInstructionDataEncoder().encode({})
        const ix = toWeb3Instruction({
            programAddress: RX_PROGRAM_ADDRESS,
            data,
            accounts: [
                { address: ownerCreator[0] as any, role: AccountRole.READONLY },
                { address: tier.toBase58() as any, role: AccountRole.WRITABLE },
                { address: pass.toBase58() as any, role: AccountRole.WRITABLE },
                { address: beneficiary.toBase58() as any, role: AccountRole.READONLY },
                { address: wallet as any, role: AccountRole.WRITABLE_SIGNER },
                { address: '11111111111111111111111111111111' as any, role: AccountRole.READONLY },
            ],
        })

        const { blockhash } = await connection!.getLatestBlockhash()
        const msg = new TransactionMessage({ payerKey: walletKey, recentBlockhash: blockhash, instructions: [ix] })
        const tx = new VersionedTransaction(msg.compileToV0Message())
        await signAndSendTransaction(tx)
    }

    return (
        <div className="card">
            <h2>Fan Page</h2>
            <form onSubmit={subscribeOrRenew}>
                <div className="form-grid two-col">
                    <div className="field">
                        <label>Creator (PDA)</label>
                        <input name="creator" placeholder="Creator PDA" required />
                    </div>
                    <div className="field">
                        <label>Tier (PDA)</label>
                        <input name="tier" placeholder="Tier PDA" required />
                    </div>
                    <div className="field">
                        <label>Payout Wallet</label>
                        <input name="payout" placeholder="Payout Pubkey" required />
                    </div>
                    <div className="field">
                        <label>Price (lamports)</label>
                        <input name="lamports" type="number" placeholder="100000000" required />
                    </div>
                </div>
                <button disabled={loading} type="submit">Subscribe/Renew</button>
            </form>
            <hr />
            <form onSubmit={grantScholarship}>
                <div className="form-grid two-col">
                    <div className="field">
                        <label>Tier (PDA)</label>
                        <input name="tier" placeholder="Tier PDA" required />
                    </div>
                    <div className="field">
                        <label>Pass (PDA)</label>
                        <input name="pass" placeholder="Pass PDA" required />
                    </div>
                    <div className="field">
                        <label>Beneficiary Wallet</label>
                        <input name="beneficiary" placeholder="Beneficiary Pubkey" required />
                    </div>
                </div>
                <button disabled={loading} type="submit">Grant Scholarship</button>
            </form>
            {sig && <div>Sig: {sig}</div>}
            {error && <div className="error">{error.message}</div>}
        </div>
    )
}
