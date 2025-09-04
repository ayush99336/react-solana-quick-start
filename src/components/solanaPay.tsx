import { useSolanaWallet } from "@web3auth/modal/react/solana";
import { useEffect, useState } from "react";
import { LAMPORTS_PER_SOL, Cluster, clusterApiUrl, Connection, PublicKey, Keypair } from '@solana/web3.js';
import { encodeURL, createQR } from '@solana/pay';
import BigNumber from 'bignumber.js';
export function SolanaPay() {
    const { accounts } = useSolanaWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const qrCode = () => {
        if (!accounts || accounts.length === 0) {
            setError("No account connected");
            return;
        }
        const publicKey = new PublicKey(accounts[0]);
        const amount = new BigNumber(0.01);
        const reference = new Keypair().publicKey;
        const label = 'Random';
        const message = 'Random - #001234';
        const memo = 'Random - #001234';
        const url = encodeURL({ recipient: publicKey, amount, reference, label, message, memo });
        const qr = createQR(url);
        qr.append(document.getElementById('qrcode')!);
    }


    return (
        <div>
            <h2>Solana Pay</h2>
            <div>
                <button onClick={qrCode} type="submit" className="card">Pay</button>
            </div>

            <div id="qrcode">
                {isLoading && <span className="loading">Loading...</span>}
                {error && <span className="error">Error: {error}</span>}
            </div>
        </div>
    )
}