const CSIM_SOURCE = "https://github.com/BlakeMasters/csim/blob/a8a1b124540129440dada5835b973166b2d2627f";

export const CSIM_POST = {
  slug: "virtual-cell-demo-with-ocura-oss",
  title: "The run ledger Csim didn't have to build",
  category: "Engineering",
  description:
    "Ocura OSS supplied command records, logs, IDs, and verification for a local simulation demo, leaving Csim to handle its own outputs and checks.",
  date: "2026-09-26",
  dateLabel: "September 26, 2026",
  readTime: "2 min read",
  art: "cells",
  sections: [
    {
      id: "execution-plumbing",
      title: "The work around the run",
      paragraphs: [
        "During a Csim hackathon, the simulation code already had to produce traces, balance amounts, write result artifacts, and decide whether an episode passed. Adding a command history would also have meant storing arguments, exit status, timing, stdout and stderr, persistent IDs, and checks for changed logs. Ocura OSS supplied that layer.",
      ],
      links: [{ label: "Integrated demo entrypoint", href: `${CSIM_SOURCE}/tools/run_integrated_demo.py` }],
    },
    {
      id: "what-ocura-supplied",
      title: "What Ocura supplied",
      paragraphs: [
        "The integrated entrypoint sends its workload to ocura-oss run --json. Ocura executes the local command, stores its outcome and logs, and returns an atom and chokepoint ID. The wrapper then calls ocura-oss verify --json to check the saved records and referenced logs. A separate synthetic campaign uses the same pattern.",
        "That gave the project a run ledger without designing another record store, log format, or verification path. Csim still needs a wrapper to choose the workload and interpret its result, but the execution history comes back as structured data.",
      ],
      links: [
        { label: "Ocura OSS state and verification", href: "/docs/state" },
        { label: "Csim campaign command", href: `${CSIM_SOURCE}/docs/NFKB_CAMPAIGN.md` },
      ],
    },
    {
      id: "what-csim-kept",
      title: "What stayed in Csim",
      paragraphs: [
        "Csim still hashes its output files, checks that its source, test, and tool fingerprint stayed stable, and evaluates its numerical results. Ocura verifies the execution record; it does not decide whether a cell model is correct. Parameter labels in Ocura describe a run but do not configure the workload.",
        "That boundary mattered in a preserved attempt: Ocura's logs verified, while Csim's receipt failed because source files changed during execution. A later local run accepted all 13 demo components and Ocura verified 64 logs. The failure and the successful rerun remained inspectable without Csim building its own command ledger. The raw local receipts and ledger are not bundled with the public source checkout.",
      ],
      links: [{ label: "Integrated demo results and limits", href: `${CSIM_SOURCE}/docs/INTEGRATED_DEMO.md` }],
    },
  ],
};
