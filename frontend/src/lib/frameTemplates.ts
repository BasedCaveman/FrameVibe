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
  }
];
