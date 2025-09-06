import { useEffect, useState } from 'react'
import { useSolanaWallet } from '@web3auth/modal/react/solana'
import { PublicKey } from '@solana/web3.js'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Lock } from 'lucide-react'
import { Button } from './ui/button'
import { RX_PROGRAM_ADDRESS } from '../../codama/client/js/generated/programs'
import bs58 from 'bs58'

interface AccessibleContent {
    tierName: string
    tierAddress: string
    creatorOwner: string
    contentUri: string
    expiryDate: Date
}

// Get all passes for the current user (reusing from MySubscriptions)
async function getMyActivePasses(connection: any, wallet: string) {
    try {
        const PASS_DISCRIMINATOR = new Uint8Array([40, 247, 140, 113, 56, 14, 57, 44])

        const passAccounts = await connection.getProgramAccounts(
            new PublicKey(RX_PROGRAM_ADDRESS),
            {
                filters: [
                    {
                        memcmp: {
                            offset: 0,
                            bytes: bs58.encode(PASS_DISCRIMINATOR)
                        }
                    },
                    {
                        memcmp: {
                            offset: 72, // offset to wallet field in Pass struct
                            bytes: wallet
                        }
                    }
                ]
            }
        )

        const now = Date.now() / 1000

        return passAccounts
            .map(({ pubkey, account }: any) => {
                const d = Buffer.from(account.data)

                const creator = new PublicKey(d.slice(8, 40))
                const tier = new PublicKey(d.slice(40, 72))
                const walletAddr = new PublicKey(d.slice(72, 104))
                const expiryTs = Number(d.readBigUInt64LE(104))

                return {
                    passPda: pubkey.toString(),
                    creator: creator.toString(),
                    tier: tier.toString(),
                    wallet: walletAddr.toString(),
                    expiryTs
                }
            })
            .filter((pass: any) => pass.expiryTs > now) // Only active passes
    } catch (error) {
        console.error('Error fetching passes:', error)
        return []
    }
}

// Get tier details with content URI
async function getTierDetails(connection: any, tierAddress: string) {
    try {
        const tierAccount = await connection.getAccountInfo(new PublicKey(tierAddress))
        if (!tierAccount) return null

        const d = Buffer.from(tierAccount.data)

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

        return {
            creator: creator.toString(),
            name,
            uri
        }
    } catch (error) {
        console.error('Error fetching tier details:', error)
        return null
    }
}

// Get creator details
async function getCreatorDetails(connection: any, creatorAddress: string) {
    try {
        const creatorAccount = await connection.getAccountInfo(new PublicKey(creatorAddress))
        if (!creatorAccount) return null

        const d = Buffer.from(creatorAccount.data)
        const owner = new PublicKey(d.slice(8, 40))

        return {
            owner: owner.toString()
        }
    } catch (error) {
        console.error('Error fetching creator details:', error)
        return null
    }
}

export function ExclusiveContent() {
    const { accounts, connection } = useSolanaWallet()
    const wallet = accounts?.[0]
    const [accessibleContent, setAccessibleContent] = useState<AccessibleContent[]>([])
    const [loading, setLoading] = useState(true)

    const loadAccessibleContent = async () => {
        if (!wallet || !connection) return

        try {
            setLoading(true)

            // Get all active passes for this wallet
            const activePasses = await getMyActivePasses(connection, wallet)

            const content: AccessibleContent[] = []

            for (const pass of activePasses) {
                try {
                    // Get tier details
                    const tierDetails = await getTierDetails(connection, pass.tier)
                    if (!tierDetails) continue

                    // Get creator details
                    const creatorDetails = await getCreatorDetails(connection, pass.creator)
                    if (!creatorDetails) continue

                    content.push({
                        tierName: tierDetails.name,
                        tierAddress: pass.tier,
                        creatorOwner: creatorDetails.owner,
                        contentUri: tierDetails.uri,
                        expiryDate: new Date(pass.expiryTs * 1000)
                    })
                } catch (error) {
                    console.error('Error processing pass:', pass, error)
                }
            }

            setAccessibleContent(content)
        } catch (error) {
            console.error('Error loading accessible content:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadAccessibleContent()
    }, [wallet, connection])

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center">Loading your exclusive content...</div>
                </CardContent>
            </Card>
        )
    }

    if (accessibleContent.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                        Exclusive Content
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        No exclusive content available. Subscribe to creators to unlock their content!
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <Lock className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">Subscribe to creators in the Fan section to access exclusive content</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        (
            // Removed space-y-6 from the main container for more explicit margin control
            <div className="">
                {/* --- Header Section --- */}
                {/* Added a bottom margin to create space below this section */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Exclusive Content ({accessibleContent.length})</h2>
                    <button
                        onClick={loadAccessibleContent}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3"
                    >
                        Refresh
                    </button>
                </div>

                {/* --- Content Grid --- */}
                {/* Added a bottom margin to create the gap between the cards and the "How it works" box */}
                <div className="grid gap-6 mb-6">
                    {accessibleContent.map((content, index) => (
                        // FIX 1: Added `text-center` to the main card container to center all text content
                        <div key={index} className="rounded-lg border bg-card text-card-foreground shadow-sm border-green-200 dark:border-green-800 text-center">
                            <div className="flex flex-col space-y-1.5 p-6">
                                {/* Added `justify-center` to center the flex items (emoji and title) */}
                                <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center justify-center gap-2">
                                    <span className="text-green-600">🔓</span>
                                    {content.tierName}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Creator: {content.creatorOwner.slice(0, 8)}...{content.creatorOwner.slice(-4)}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Access expires: {content.expiryDate.toLocaleDateString()}
                                </p>
                            </div>
                            <div className="p-6 pt-0">
                                {content.contentUri && content.contentUri !== `https://example.com/tier/${content.tierAddress}` ? (
                                    <div className="space-y-4">
                                        {/* Added `justify-center` to center the label and link */}
                                        <div className="flex items-baseline justify-center gap-2">
                                            <h4 className="font-semibold text-sm">Content URL:</h4>
                                            <a
                                                href={content.contentUri}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium underline hover:no-underline"
                                            >
                                                Open Link
                                            </a>
                                        </div>
                                        <a
                                            href={content.contentUri}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center w-full rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
                                        >
                                            Access Content →
                                        </a>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                        <div className="text-4xl mb-2">📝</div>
                                        <p className="text-gray-500 dark:text-gray-400">Creator hasn't added content URL yet</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                            Contact the creator for access instructions
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* --- "How it works" Info Box --- */}
                {/* This box will now have a consistent gap above it due to the `mb-6` on the grid container */}
                <div className="rounded-lg border shadow-sm bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <div className="p-6">
                        <div className="flex items-start gap-3">
                            <div className="text-blue-600 text-xl">💡</div>
                            <div>
                                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">How it works:</h4>
                                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                                    <li>• Subscribe to creators to unlock their exclusive content</li>
                                    <li>• Content appears here automatically when you have active subscriptions</li>
                                    <li>• Access expires when your subscription ends</li>
                                    <li>• Creators can update content URLs anytime</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    )
}
