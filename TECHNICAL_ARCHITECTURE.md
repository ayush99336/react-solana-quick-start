# SubSync - Technical Architecture

**Deep Dive into Web3Auth Integration and Solana Implementation**

## 🏗 System Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Web3Auth       │    │   Solana        │
│   React App     │◄──►│   Embedded       │◄──►│   Blockchain    │
│                 │    │   Wallet         │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   UI Components │    │   Social Login   │    │   Smart         │
│   Subscription  │    │   JWT Tokens     │    │   Contracts     │
│   Management    │    │   Key Management │    │   (Anchor)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🔐 Web3Auth Integration Deep Dive

### Authentication Flow

```typescript
// 1. Social Login Configuration
const web3AuthConfig = {
  clientId: process.env.VITE_WEB3AUTH_CLIENT_ID,
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
  chainConfig: {
    chainNamespace: CHAIN_NAMESPACES.SOLANA,
    chainId: "0x3", // Solana Devnet
    rpcTarget: "https://api.devnet.solana.com",
  },
};

// 2. Hook-based Integration
const { connect, isConnected } = useWeb3AuthConnect();
const { userInfo } = useWeb3AuthUser();
const { accounts, connection } = useSolanaWallet();

// 3. Seamless Connection
await connect(WALLET_CONNECTORS.SOCIAL);
```

### Key Management Innovation

- **Threshold Key Management**: Keys distributed across Web3Auth nodes
- **Metadata Server**: User data encrypted and stored securely
- **Social Recovery**: Account recovery through social login providers
- **Non-Custodial**: Platform never has access to user private keys

### Provider Configuration

```typescript
// Multiple social providers supported
const socialProviders = [
  WALLET_CONNECTORS.GOOGLE,
  WALLET_CONNECTORS.FACEBOOK,
  WALLET_CONNECTORS.TWITTER,
  WALLET_CONNECTORS.DISCORD,
  WALLET_CONNECTORS.EMAIL_PASSWORDLESS,
];
```

## ⛓ Solana Blockchain Architecture

### Smart Contract Design

```rust
// Core account structures using Anchor framework
#[account]
pub struct Creator {
    pub owner: Pubkey,           // Creator's wallet
    pub name: String,            // Display name
    pub bio: String,             // Creator bio
    pub profile_uri: String,     // Profile image/link
    pub tier_count: u32,         // Number of tiers created
}

#[account]
pub struct Tier {
    pub creator: Pubkey,         // Reference to creator
    pub index: u32,              // Tier index for this creator
    pub price: u64,              // Price in lamports
    pub token_mint: Pubkey,      // SOL or SPL token
    pub duration_sec: u64,       // Subscription duration
    pub name: String,            // Tier name
    pub content_uri: String,     // Exclusive content link
}

#[account]
pub struct Pass {
    pub creator: Pubkey,         // Creator account
    pub tier: Pubkey,            // Tier account
    pub wallet: Pubkey,          // Subscriber wallet
    pub expiry_ts: u64,          // Unix timestamp expiry
}
```

### Program Derived Addresses (PDAs)

```typescript
// Deterministic account generation
const [creatorPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("creator"), walletPublicKey.toBuffer()],
  program.programId
);

const [tierPDA] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("tier"),
    creatorPDA.toBuffer(),
    new BN(tierIndex).toArrayLike(Buffer, "le", 4),
  ],
  program.programId
);

const [passPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("pass"), tierPDA.toBuffer(), subscriberWallet.toBuffer()],
  program.programId
);
```

## 🔍 Global Discovery System

### Account Scanning Implementation

```typescript
// Efficient blockchain scanning with memcmp filters
async function getAllCreators(connection: Connection) {
  const CREATOR_DISCRIMINATOR = new Uint8Array([
    234, 33, 243, 90, 100, 36, 215, 137,
  ]);

  const creatorAccounts = await connection.getProgramAccounts(
    new PublicKey(RX_PROGRAM_ADDRESS),
    {
      filters: [
        {
          memcmp: {
            offset: 0, // Account discriminator offset
            bytes: bs58.encode(CREATOR_DISCRIMINATOR),
          },
        },
      ],
    }
  );

  return creatorAccounts.map(({ pubkey, account }) => {
    const data = Buffer.from(account.data);
    return parseCreatorAccount(data, pubkey);
  });
}
```

### Data Parsing and Deserialization

```typescript
function parseCreatorAccount(data: Buffer, pubkey: PublicKey) {
  let offset = 8; // Skip discriminator

  const owner = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  const tierCount = data.readUInt32LE(offset);
  offset += 4;

  // Parse variable-length strings
  const nameLength = data.readUInt32LE(offset);
  offset += 4;
  const name = data.slice(offset, offset + nameLength).toString("utf8");
  offset += nameLength;

  const bioLength = data.readUInt32LE(offset);
  offset += 4;
  const bio = data.slice(offset, offset + bioLength).toString("utf8");

  return {
    address: pubkey.toString(),
    owner: owner.toString(),
    name,
    bio,
    tierCount,
  };
}
```

## 💳 Solana Pay Integration

### Payment Request Generation

```typescript
import { createPaymentRequest } from "@solana/pay";
import BigNumber from "bignumber.js";

async function createSubscriptionPayment(
  tierPrice: number,
  creatorWallet: string,
  tierAddress: string
) {
  const amount = new BigNumber(tierPrice / LAMPORTS_PER_SOL);
  const reference = Keypair.generate().publicKey;

  const paymentRequest = await createPaymentRequest({
    recipient: new PublicKey(creatorWallet),
    amount,
    reference,
    label: `Subscribe to ${tierName}`,
    message: `Subscription to ${creatorName} - ${tierName}`,
    memo: `tier:${tierAddress}`,
  });

  return {
    qrCode: paymentRequest.url,
    reference: reference.toString(),
  };
}
```

### Payment Verification

```typescript
async function verifyPayment(reference: string, expectedAmount: number) {
  const signatures = await connection.getSignaturesForAddress(
    new PublicKey(reference),
    { limit: 10 }
  );

  for (const sig of signatures) {
    const transaction = await connection.getTransaction(sig.signature);
    if (transaction?.meta?.postBalances) {
      // Verify payment amount and process subscription
      return processSubscription(transaction);
    }
  }
}
```

## 🔄 Real-time State Management

### Subscription Auto-Discovery

```typescript
// Automatic discovery of user's subscriptions
async function getMyActivePasses(connection: Connection, wallet: string) {
  const PASS_DISCRIMINATOR = new Uint8Array([
    40, 247, 140, 113, 56, 14, 57, 44,
  ]);

  const passAccounts = await connection.getProgramAccounts(
    new PublicKey(RX_PROGRAM_ADDRESS),
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: bs58.encode(PASS_DISCRIMINATOR),
          },
        },
        {
          memcmp: {
            offset: 72, // Wallet field offset
            bytes: wallet,
          },
        },
      ],
    }
  );

  const now = Date.now() / 1000;
  return passAccounts
    .map(parsePassAccount)
    .filter((pass) => pass.expiryTs > now);
}
```

### Content Access Verification

```typescript
async function verifyContentAccess(
  userWallet: string,
  tierAddress: string
): Promise<boolean> {
  const activePasses = await getMyActivePasses(connection, userWallet);

  return activePasses.some(
    (pass) => pass.tier === tierAddress && pass.expiryTs > Date.now() / 1000
  );
}
```

## 🎨 Frontend Architecture

### Component Structure

```
src/
├── components/
│   ├── CreatorDashboard.tsx     # Creator tier management
│   ├── CreatorDiscovery.tsx     # Global creator browsing
│   ├── MySubscriptions.tsx      # User's subscription list
│   ├── ExclusiveContent.tsx     # Content access interface
│   ├── SolanaPayHub.tsx         # Payment QR code generation
│   ├── WalletFunding.tsx        # Wallet top-up interface
│   ├── Navbar.tsx               # Navigation with Web3Auth
│   └── ui/                      # Reusable UI components
├── hooks/
│   ├── useSolanaWallet.ts       # Web3Auth Solana integration
│   └── useWeb3Auth.ts           # Authentication state
└── utils/
    ├── solana.ts                # Blockchain utilities
    └── constants.ts             # Program addresses
```

### State Management

```typescript
// React state with automatic updates
const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
const [loading, setLoading] = useState(true);

// Automatic refresh on wallet connection
useEffect(() => {
  if (wallet && connection) {
    loadSubscriptions();
  }
}, [wallet, connection]);

// Real-time subscription updates
const loadSubscriptions = async () => {
  const passes = await getMyActivePasses(connection, wallet);
  const subscriptionDetails = await Promise.all(
    passes.map((pass) => getTierAndCreatorDetails(pass))
  );
  setSubscriptions(subscriptionDetails);
};
```

## 🚀 Performance Optimizations

### Efficient Blockchain Queries

- **Batch Requests**: Multiple account lookups in single RPC call
- **Filter Optimization**: memcmp filters to reduce network overhead
- **Caching Strategy**: Client-side caching of creator and tier data
- **Pagination**: Chunked loading for large creator lists

### User Experience Optimizations

- **Optimistic Updates**: UI updates before blockchain confirmation
- **Error Boundaries**: Graceful error handling and recovery
- **Loading States**: Progressive loading indicators
- **Responsive Design**: Mobile-first responsive layouts

## 🔒 Security Considerations

### Web3Auth Security

- **Threshold Signatures**: No single point of failure
- **Encrypted Metadata**: User data encrypted at rest
- **Session Management**: Secure JWT token handling
- **Social Recovery**: Multi-factor account recovery

### Smart Contract Security

- **Account Validation**: Strict PDA derivation checks
- **Access Controls**: Owner-only functions properly gated
- **Overflow Protection**: Safe math operations
- **Reentrancy Guards**: Protection against attack vectors

### Frontend Security

- **Input Validation**: All user inputs sanitized
- **XSS Protection**: Content Security Policy headers
- **API Key Security**: Environment variable management
- **Transport Security**: HTTPS-only communication

## 📊 Monitoring and Analytics

### Blockchain Metrics

- Transaction success rates
- Average confirmation times
- Network fee optimization
- Account growth tracking

### User Experience Metrics

- Onboarding completion rates
- Time to first subscription
- Payment success rates
- Content access patterns

### Performance Monitoring

- Component render times
- API response latencies
- Error rates and types
- User session analytics

---

This technical architecture demonstrates how SubSync leverages Web3Auth's embedded wallet technology to create a seamless bridge between Web2 UX patterns and Web3 functionality, while maintaining the security and decentralization benefits of blockchain technology.
