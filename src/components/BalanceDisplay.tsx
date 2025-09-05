import { useEffect, useState } from 'react'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'

export function BalanceDisplay({ connection, account, refreshTrigger }: any) {
    const [balance, setBalance] = useState<number | null>(null)
    useEffect(() => {
        let mounted = true
            ; (async () => {
                try {
                    if (!connection || !account) return
                    const lamports = await connection.getBalance(new PublicKey(account))
                    if (mounted) setBalance(lamports / LAMPORTS_PER_SOL)
                } catch { }
            })()
        return () => { mounted = false }
    }, [connection, account, refreshTrigger])
    return <span className="balance-display">{balance === null ? '—' : `${balance.toFixed(3)} SOL`}</span>
}
