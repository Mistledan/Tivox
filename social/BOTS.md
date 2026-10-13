# BOTS — recommended third-party bots for the group/channel

Our own bot handles price, info, verification, and welcome. These are the
well-known third-party bots to add alongside it. **Give them only the minimum
permissions they need — never full admin on a channel where the pinned
announcement lives.**

## Anti-spam (add first, most important)

| Bot | What it does | Setup |
|-----|--------------|-------|
| @ShieldyBot | Captcha + anti-flood gate for new members | Add to group, grant admin, `/settings` basic |
| @GroupHelpBot | Greets new members, cleans spam, night mode scheduling | Add, configure greeting to link the pinned announcement |

These two stop the "buy this token" spam that kills new channels. Note:
@ShieldyBot's captcha only works in a **group**, not a channel. If your
announcement space is a channel, keep the group as the interactive home and the
channel as broadcast-only.

## Chart / price

No third-party bot needed — our bot already answers `/chart` (DexScreener link)
and `/price` (live snapshot). Third-party chart bots usually need admin rights
and can spam; skip them.

## Trading convenience (optional)

| Bot | What it does | Caveat |
|-----|--------------|--------|
| @CryptoBot | In-chat buy/sell for popular assets | Does NOT support arbitrary TVX yet; if it ever lists TVX, use it — until then, ignore |

Do NOT chase "paid trading bots" or "signal bots" advertised in DMs. 100% of
them are scams.

## Golden rules

1. Our OWN bot is the only bot that gets admin **forever**. Third-party bots get
   the minimum role, and only for the feature they provide.
2. The ONLY link we ever promote is the verified contract / the site.
3. If a bot asks for the TVX wallet private key, wallet seed, or a "listing fee"
   — block it and report it. It is a scam.
4. Re-run `/check <address>` with any address before posting it anywhere.

## "Rose"

If by "Rose" you mean the bot you've seen in other crypto channels (usually a
greeter/moderator/price bot), its closest safe equivalents are @GroupHelpBot for
welcome + moderation — with our `/price` and `/chart` for data. If it's a
specific bot, send me its exact @username (or its @BotFather link) and I'll
verify what it does and how to add it safely before you grant it anything.