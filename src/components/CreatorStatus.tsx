import { useEffect, useMemo, useState } from 'react'
import { useSolanaWallet } from '@web3auth/modal/react/solana'
import { PublicKey } from '@solana/web3.js'
import { fetchMaybeCreatorW3J, fetchMaybeTierW3J } from '../lib/fetchers'
import { findCreatorPda, findTierPda } from '../lib/pdas'

type TierRow = { index: number; address: string; exists: boolean; name?: string; priceLamports?: string; durationSec?: string }

export function CreatorStatus() {
    const { accounts, connection } = useSolanaWallet()
    const owner = accounts?.[0]
    const [creatorAddr, setCreatorAddr] = useState<string>('')
    const [initialized, setInitialized] = useState<boolean | null>(null)
    const [tiers, setTiers] = useState<TierRow[]>([])

    const ownerKey = useMemo(() => (owner ? new PublicKey(owner) : undefined), [owner])

    useEffect(() => {
        ; (async () => {
            if (!owner || !connection) return
            const creatorPda = await findCreatorPda(owner as any)
            setCreatorAddr(creatorPda[0] as any)
            const maybeCreator = await fetchMaybeCreatorW3J(connection as any, creatorPda[0] as any)
            setInitialized(maybeCreator.exists)
            // Probe tiers 0..4
            const out: TierRow[] = []
            for (let i = 0; i < 5; i++) {
                const tierPda = await findTierPda(creatorPda[0] as any, i)
                try {
                    const maybeTier = await fetchMaybeTierW3J(connection as any, tierPda[0] as any)
                    out.push({
                        index: i,
                        address: tierPda[0] as any,
                        exists: maybeTier.exists,
                        name: maybeTier.exists ? (maybeTier.data as any).name : undefined,
                        priceLamports: maybeTier.exists ? (maybeTier.data as any).priceLamports.toString() : undefined,
                        durationSec: maybeTier.exists ? (maybeTier.data as any).durationSec.toString() : undefined,
                    })
                } catch {
                    out.push({ index: i, address: tierPda[0] as any, exists: false })
                }
            }
            setTiers(out)
        })()
    }, [owner, connection])

    return (
        <div className="card">
            <h3>Creator Status</h3>
            <div className="flex-col">
                <div><strong>Creator PDA:</strong> {creatorAddr || '-'}</div>
                <div><strong>Initialized:</strong> {initialized === null ? '—' : initialized ? 'Yes' : 'No'}</div>
            </div>
            <div className="grid" style={{ marginTop: 12 }}>
                <div><strong>Detected Tiers (0-4)</strong></div>
                <div className="flex-col">
                    {tiers.map(t => (
                        <div key={t.index} className="card" style={{ textAlign: 'left' }}>
                            <div><strong>Index:</strong> {t.index}</div>
                            <div><strong>Address:</strong> {t.address}</div>
                            <div><strong>Exists:</strong> {t.exists ? 'Yes' : 'No'}</div>
                            {t.exists && (
                                <div className="grid">
                                    <div><strong>Name:</strong> {t.name}</div>
                                    <div><strong>Price (lamports):</strong> {t.priceLamports}</div>
                                    <div><strong>Duration (sec):</strong> {t.durationSec}</div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
