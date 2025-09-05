import { useEffect, useMemo, useState, useCallback } from 'react'
import { useSolanaWallet } from '@web3auth/modal/react/solana'
import { PublicKey } from '@solana/web3.js'
import { fetchMaybePassW3J } from '../lib/fetchers'
import { findPassPda } from '../lib/pdas'

export function ExclusiveContent() {
    const { accounts, connection } = useSolanaWallet()
    const wallet = accounts?.[0]
    const [hasAccess, setHasAccess] = useState<boolean>(false)
    const [checking, setChecking] = useState<boolean>(false)
    const [tierAddr, setTierAddr] = useState<string>('')
    const [error, setError] = useState<string>('')

    const walletKey = useMemo(() => (wallet ? new PublicKey(wallet) : undefined), [wallet])

    const isValidBase58 = (s: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)

    const handleCheck = useCallback(async () => {
        setError('')
        setHasAccess(false)
        if (!wallet) {
            setError('Connect wallet to continue.')
            return
        }
        if (!connection) {
            setError('Connection not ready. Try again in a moment.')
            return
        }
        if (!isValidBase58(tierAddr)) {
            setError('Enter a valid Tier PDA (base58, 32-44 chars).')
            return
        }
        setChecking(true)
        try {
            // Validate via PublicKey to catch any edge cases
            // If invalid, this throws and we surface a friendly error
            // eslint-disable-next-line no-new
            new PublicKey(tierAddr)
            const passPda = await findPassPda(tierAddr as any, wallet as any)
            const maybe = await fetchMaybePassW3J(connection as any, passPda[0] as any)
            const now = BigInt(Math.floor(Date.now() / 1000))
            setHasAccess(Boolean(maybe.exists && maybe.data.expiryTs > now))
        } catch (e: any) {
            setError(e?.message || 'Failed to check pass.')
        } finally {
            setChecking(false)
        }
    }, [wallet, connection, tierAddr])

    return (
        <div className="card">
            <h3>Exclusive Content Gate</h3>
            <div className="field">
                <label>Tier (PDA)</label>
                <input
                    placeholder="Enter Tier PDA (base58)"
                    value={tierAddr}
                    onChange={(e) => setTierAddr(e.target.value.trim())}
                />
            </div>
            <div className="flex-row">
                <button onClick={handleCheck} disabled={checking}>
                    {checking ? 'Checking…' : 'Check Access'}
                </button>
                {!walletKey && <span className="error">Connect wallet to check access.</span>}
            </div>
            {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
            {!error && !checking && (
                hasAccess ? (
                    <div className="success" style={{ marginTop: 8 }}>Unlocked: Enjoy exclusive content! 🎉</div>
                ) : (
                    <div className="text-muted" style={{ marginTop: 8 }}>No active pass found for this tier.</div>
                )
            )}
        </div>
    )
}
