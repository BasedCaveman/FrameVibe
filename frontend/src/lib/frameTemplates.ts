export type FrameStepKind = "VERIFY" | "EXECUTION" | "APPROVE";

export type FrameStep = {
  kind: FrameStepKind;
  title: string;
  detail: string;
};

export type FrameTemplate = {
  id: string;
  name: string;
  chainFit: string;
  steps: FrameStep[];
};

export const templates: FrameTemplate[] = [
  {
    id: "gasless-onboarding",
    name: "Gasless Onboarding",
    chainFit: "MegaETH for instant first actions, Base for broad distribution.",
    steps: [
      { kind: "VERIFY", title: "Passkey or EOA", detail: "Validate a fresh user without exposing raw protocol steps." },
      { kind: "APPROVE", title: "Treasury sponsor", detail: "Allow the dApp treasury to cover the first set of interactions." },
      { kind: "EXECUTION", title: "Mint welcome asset", detail: "Batch account setup and first mint into one atomic flow." }
    ]
  },
  {
    id: "game-session-keys",
    name: "Game Session Keys",
    chainFit: "Best on MegaETH where latency matters during play.",
    steps: [
      { kind: "VERIFY", title: "Session validator", detail: "Grant a short-lived validator for low-friction gameplay." },
      { kind: "EXECUTION", title: "Batch game actions", detail: "Move, craft, claim, or trade without repeated wallet prompts." },
      { kind: "APPROVE", title: "Sponsor cap", detail: "Limit sponsorship by gas, value, use count, and deadline." }
    ]
  },
  {
    id: "dao-proposal-vote",
    name: "DAO Proposal + Vote",
    chainFit: "MegaETH for live governance UX, Base for ecosystem integrations.",
    steps: [
      { kind: "VERIFY", title: "Member auth", detail: "Verify holder, multisig, or delegated identity." },
      { kind: "EXECUTION", title: "Propose and vote", detail: "Submit proposal and cast the first vote atomically." },
      { kind: "APPROVE", title: "DAO sponsor", detail: "Sponsor eligible governance actions from the DAO treasury." }
    ]
  },
  {
    id: "private-spend-recent-root",
    name: "Private Spend with Recent Root",
    chainFit: "Uses EIP-8272-style recent root references for privacy-oriented validation demos.",
    steps: [
      { kind: "VERIFY", title: "Recent root check", detail: "Bind authorization to a recent wallet, note, or membership root." },
      { kind: "EXECUTION", title: "Shielded action", detail: "Execute a spend, claim, or swap wrapper without leaking full app state." },
      { kind: "APPROVE", title: "Bound sponsor", detail: "Sponsor only if the signed frame references the expected root source." }
    ]
  },
  {
    id: "keyed-nonce-session",
    name: "Session Key with Keyed Nonce",
    chainFit: "Parallel flows for games, agents, and delegated actions on MegaETH.",
    steps: [
      { kind: "VERIFY", title: "Nonce key", detail: "Give each session, agent, or privacy nullifier its own replay lane." },
      { kind: "EXECUTION", title: "Parallel actions", detail: "Run independent frame sequences without blocking the owner nonce." },
      { kind: "APPROVE", title: "Session budget", detail: "Attach gas and value caps to the same delegated session." }
    ]
  },
  {
    id: "focil-ready-sponsored-action",
    name: "FOCIL-ready Sponsored Action",
    chainFit: "Designed for public, inclusion-friendly sponsored actions as the protocol layer evolves.",
    steps: [
      { kind: "VERIFY", title: "Public validation", detail: "Keep validation bounded and legible for inclusion-list compatible flows." },
      { kind: "APPROVE", title: "Explicit gas payer", detail: "Separate sponsorship from execution so relayers can reason about payment." },
      { kind: "EXECUTION", title: "Atomic target call", detail: "Execute the user outcome after validation and payment constraints are clear." }
    ]
  }
];
