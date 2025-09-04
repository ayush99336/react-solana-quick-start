use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("D43Xs9NAXeKBHUhDATKua8kvJhmr5gXMNPTdMfR2z29n"); // <- your deployed id

#[program]
pub mod rx {
    use super::*;

    pub fn init_creator(ctx: Context<InitCreator>, payout_wallet: Pubkey) -> Result<()> {
        let creator = &mut ctx.accounts.creator;
        creator.owner = ctx.accounts.owner.key();
        creator.payout_wallet = payout_wallet;
        Ok(())
    }

    /// Create tier with pricing + duration + scholarship capacity.
    /// If `token_mint == Pubkey::default()` it means SOL pricing.
    pub fn create_tier(
        ctx: Context<CreateTier>,
        index: u32,
        price_lamports: u64,
        token_mint: Pubkey,
        duration_sec: u64,
        name: String,
        uri: String,
        scholarship_remaining: u32,
    ) -> Result<()> {
        require!(
            name.as_bytes().len() <= Tier::NAME_MAX,
            RxError::NameTooLong
        );
        require!(uri.as_bytes().len() <= Tier::URI_MAX, RxError::UriTooLong);

        let tier = &mut ctx.accounts.tier;
        tier.creator = ctx.accounts.creator.key();
        tier.index = index;
        tier.price_lamports = price_lamports;
        tier.token_mint = token_mint;
        tier.duration_sec = duration_sec;
        tier.name = name;
        tier.uri = uri;
        tier.scholarship_remaining = scholarship_remaining;
        Ok(())
    }

    /// ONE function for both "subscribe" and "renew".
    /// - If SOL-priced, atomically transfers SOL to payout wallet.
    /// - Then creates (if needed) or renews the pass by one duration.
    pub fn subscribe_or_renew(ctx: Context<SubscribeOrRenew>) -> Result<()> {
        let clock = Clock::get()?;
        let now = clock.unix_timestamp as u64;

        let tier = &ctx.accounts.tier;

        // 1) Atomic SOL payment (only when SOL pricing and price > 0)
        if tier.token_mint == Pubkey::default() && tier.price_lamports > 0 {
            // Ensure `payout` matches on-chain configured payout wallet to prevent spoofing
            require_keys_eq!(
                ctx.accounts.payout.key(),
                ctx.accounts.creator.payout_wallet,
                RxError::InvalidPayoutWallet
            );

            // CPI: payer -> payout
            transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.payer.to_account_info(),
                        to: ctx.accounts.payout.to_account_info(),
                    },
                ),
                tier.price_lamports,
            )?;
        } else {
            // For hackathon MVP we do not support SPL token payments in-contract.
            // (Add a token transfer CPI path later if needed.)
            require!(
                tier.token_mint == Pubkey::default(),
                RxError::TokenPaymentsNotSupported
            );
        }

        // 2) Pass logic (create or extend)
        let pass = &mut ctx.accounts.pass;
        if pass.expiry_ts == 0 {
            pass.creator = ctx.accounts.creator.key();
            pass.tier = tier.key();
            pass.wallet = ctx.accounts.payer.key();
            pass.expiry_ts = now
                .checked_add(tier.duration_sec)
                .ok_or(RxError::MathOverflow)?;
        } else if pass.expiry_ts > now {
            pass.expiry_ts = pass
                .expiry_ts
                .checked_add(tier.duration_sec)
                .ok_or(RxError::MathOverflow)?;
        } else {
            pass.expiry_ts = now
                .checked_add(tier.duration_sec)
                .ok_or(RxError::MathOverflow)?;
        }

        Ok(())
    }

    /// Impact feature: creator grants a free period to a beneficiary.
    /// Decrements `scholarship_remaining`. Owner pays rent for the pass.
    pub fn grant_scholarship(ctx: Context<GrantScholarship>) -> Result<()> {
        let clock = Clock::get()?;
        let now = clock.unix_timestamp as u64;

        let tier = &mut ctx.accounts.tier;
        require!(tier.scholarship_remaining > 0, RxError::NoScholarshipSlots);
        tier.scholarship_remaining = tier
            .scholarship_remaining
            .checked_sub(1)
            .ok_or(RxError::MathOverflow)?;

        let pass = &mut ctx.accounts.pass;
        if pass.expiry_ts == 0 {
            pass.creator = ctx.accounts.creator.key();
            pass.tier = tier.key();
            pass.wallet = ctx.accounts.beneficiary.key();
            pass.expiry_ts = now
                .checked_add(tier.duration_sec)
                .ok_or(RxError::MathOverflow)?;
        } else if pass.expiry_ts > now {
            pass.expiry_ts = pass
                .expiry_ts
                .checked_add(tier.duration_sec)
                .ok_or(RxError::MathOverflow)?;
        } else {
            pass.expiry_ts = now
                .checked_add(tier.duration_sec)
                .ok_or(RxError::MathOverflow)?;
        }

        Ok(())
    }

    /// Optional: refill scholarship pool.
    pub fn refill_scholarships(ctx: Context<RefillScholarships>, add_slots: u32) -> Result<()> {
        let tier = &mut ctx.accounts.tier;
        tier.scholarship_remaining = tier
            .scholarship_remaining
            .checked_add(add_slots)
            .ok_or(RxError::MathOverflow)?;
        Ok(())
    }
}

/* ------------------------------- ACCOUNTS ------------------------------- */

#[derive(Accounts)]
pub struct InitCreator<'info> {
    #[account(
        init,
        payer = owner,
        space = Creator::SPACE,
        seeds = [b"creator", owner.key().as_ref()],
        bump
    )]
    pub creator: Account<'info, Creator>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    index: u32,
    price_lamports: u64,
    token_mint: Pubkey,
    duration_sec: u64,
    name: String,
    uri: String,
    scholarship_remaining: u32
)]
pub struct CreateTier<'info> {
    #[account(
        seeds = [b"creator", owner.key().as_ref()],
        bump,
        constraint = creator.owner == owner.key() @ RxError::Unauthorized
    )]
    pub creator: Account<'info, Creator>,

    #[account(
        init,
        payer = owner,
        space = Tier::SPACE,
        seeds = [b"tier", creator.key().as_ref(), &index.to_le_bytes()],
        bump
    )]
    pub tier: Account<'info, Tier>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubscribeOrRenew<'info> {
    #[account(
        seeds = [b"creator", creator.owner.as_ref()],
        bump
    )]
    pub creator: Account<'info, Creator>,

    #[account(
        seeds = [b"tier", creator.key().as_ref(), &tier.index.to_le_bytes()],
        bump,
        constraint = tier.creator == creator.key() @ RxError::InvalidTierCreator
    )]
    pub tier: Account<'info, Tier>,

    // Atomic payment sink; must equal on-chain configured payout wallet.
    #[account(mut, address = creator.payout_wallet @ RxError::InvalidPayoutWallet)]
    pub payout: SystemAccount<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        space = Pass::SPACE,
        seeds = [b"pass", tier.key().as_ref(), payer.key().as_ref()],
        bump
    )]
    pub pass: Account<'info, Pass>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GrantScholarship<'info> {
    #[account(
        seeds = [b"creator", owner.key().as_ref()],
        bump,
        constraint = creator.owner == owner.key() @ RxError::Unauthorized
    )]
    pub creator: Account<'info, Creator>,

    #[account(
        mut,
        seeds = [b"tier", creator.key().as_ref(), &tier.index.to_le_bytes()],
        bump,
        constraint = tier.creator == creator.key() @ RxError::InvalidTierCreator
    )]
    pub tier: Account<'info, Tier>,

    // Pass belongs to beneficiary; owner pays rent for scholarship issuance.
    #[account(
        init_if_needed,
        payer = owner,
        space = Pass::SPACE,
        seeds = [b"pass", tier.key().as_ref(), beneficiary.key().as_ref()],
        bump
    )]
    pub pass: Account<'info, Pass>,

    /// Beneficiary does not need to sign to receive a scholarship.
    pub beneficiary: SystemAccount<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RefillScholarships<'info> {
    #[account(
        seeds = [b"creator", owner.key().as_ref()],
        bump,
        constraint = creator.owner == owner.key() @ RxError::Unauthorized
    )]
    pub creator: Account<'info, Creator>,

    #[account(
        mut,
        seeds = [b"tier", creator.key().as_ref(), &tier.index.to_le_bytes()],
        bump,
        constraint = tier.creator == creator.key() @ RxError::InvalidTierCreator
    )]
    pub tier: Account<'info, Tier>,

    #[account(mut)]
    pub owner: Signer<'info>,
}

/* -------------------------------- STATE --------------------------------- */

#[account]
pub struct Creator {
    pub owner: Pubkey,
    pub payout_wallet: Pubkey,
}
impl Creator {
    pub const SPACE: usize = 8 + 32 + 32;
}

#[account]
pub struct Tier {
    pub creator: Pubkey,
    pub index: u32,
    pub price_lamports: u64,
    pub token_mint: Pubkey, // default() => SOL pricing
    pub duration_sec: u64,
    pub name: String, // <= 64
    pub uri: String,  // <= 200
    pub scholarship_remaining: u32,
}
impl Tier {
    pub const NAME_MAX: usize = 64;
    pub const URI_MAX: usize = 200;
    pub const SPACE: usize = 8 + // disc
        32 + // creator
        4  + // index
        8  + // price
        32 + // token_mint
        8  + // duration
        4 + Self::NAME_MAX + // name
        4 + Self::URI_MAX +  // uri
        4; // scholarship_remaining
}

#[account]
pub struct Pass {
    pub creator: Pubkey,
    pub tier: Pubkey,
    pub wallet: Pubkey,
    pub expiry_ts: u64,
}
impl Pass {
    pub const SPACE: usize = 8 + 32 + 32 + 32 + 8;
}

/* -------------------------------- ERRORS -------------------------------- */

#[error_code]
pub enum RxError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Name too long")]
    NameTooLong,
    #[msg("URI too long")]
    UriTooLong,
    #[msg("Invalid tier/creator relationship")]
    InvalidTierCreator,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("SPL token payments are not supported in-contract for MVP")]
    TokenPaymentsNotSupported,
    #[msg("Payout wallet account does not match on-chain configuration")]
    InvalidPayoutWallet,
    #[msg("No scholarship slots remaining")]
    NoScholarshipSlots,
}
