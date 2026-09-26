const CSIM_SOURCE = "https://github.com/BlakeMasters/csim/blob/a8a1b124540129440dada5835b973166b2d2627f";

export const CSIM_POST = {
  slug: "virtual-cell-demo-with-ocura-oss",
  title: "Keeping a cell simulation inspectable",
  category: "Engineering",
  description:
    "A local cell-simulation study shows where Ocura OSS execution records help, and where numerical and biological evidence need their own checks.",
  date: "2026-09-26",
  dateLabel: "September 26, 2026",
  readTime: "5 min read",
  art: "cells",
  sections: [
    {
      id: "a-visible-experiment",
      title: "A visible experiment",
      paragraphs: [
        "Csim is a small Python reference environment for exploring how virtual cells respond to declared stimuli and finite material transfers. Its local playground shows one to five identified cells in a shared field. You can step an episode, select a cell, and inspect its before-and-after state alongside the amount transferred in that interval.",
        "The display makes a run easy to follow. To review it later, we also need the inputs, the accepted steps, the measurements made by the workload, and the command that produced them. Csim records those model-specific details; Ocura OSS records the surrounding execution.",
        "These are synthetic cell-response hypotheses. The playground also displays observed NF-κB p65 reporter traces, but those observations sit in a separate view and do not set the illustrative payload-response law.",
      ],
      links: [
        { label: "Three-cell playground screenshot", href: `${CSIM_SOURCE}/docs/images/virtual-cell-interaction.jpg` },
        { label: "Csim implementation status", href: `${CSIM_SOURCE}/IMPLEMENTATION_STATUS.md` },
      ],
    },
    {
      id: "a-matched-campaign",
      title: "A matched synthetic campaign",
      paragraphs: [
        "One local campaign compares a stimulus-only baseline with a generic-payload intervention under matched schedules and, for seeded runs, the same seed. It varies cell count from one to five and uses two declared payload protocols. The preserved result reports 30 matched pairs, 60 completed runs, 4,920 accepted steps, and no failed runs.",
        "Each run retains its sampled reporter index and an amount ledger. The largest reported paired amount-balance residual was 1.39 × 10⁻¹⁷ mol. The campaign also keeps incomplete attempts and would leave a pair's difference unset if either arm failed. The reported differences describe this synthetic response law. They do not estimate drug efficacy or agreement with measured p65 responses.",
      ],
      links: [
        { label: "Campaign contract and local result summary", href: `${CSIM_SOURCE}/docs/NFKB_CAMPAIGN.md` },
        { label: "Campaign review screenshot", href: `${CSIM_SOURCE}/docs/images/nfkb-campaign-review.jpg` },
      ],
    },
    {
      id: "recording-the-command",
      title: "Recording the command",
      paragraphs: [
        "The shared demo calls its workload through Ocura OSS. The package retains the command arguments, outcome, timing, stdout, stderr, and an atom and chokepoint ID. The wrapper then asks Ocura to verify the local ledger. Csim separately hashes its inputs and result files and checks that its ordered source, test, and tool fingerprint stayed the same throughout the workload.",
        "Those checks answer different questions. Ocura can detect an inconsistent execution record or changed log bytes. The simulator's traces and focused tests check the declared numerical behavior. Neither check establishes that an illustrative response matches living cells.",
        "That distinction mattered during development. An earlier integrated attempt retained its Ocura logs but failed Csim's receipt because source files changed while it ran. After the source stabilized, a Windows CPU run accepted all 13 bounded components; Ocura reported 64 verified logs with zero problems. The failed attempt remained in the local record rather than disappearing behind the passing summary.",
      ],
      links: [
        { label: "Integrated demo and receipt fields", href: `${CSIM_SOURCE}/docs/INTEGRATED_DEMO.md` },
        { label: "Ocura OSS state and verification", href: "/docs/state" },
      ],
    },
    {
      id: "keeping-observations-separate",
      title: "Keeping observations separate",
      paragraphs: [
        "Csim has a separate observed-data lane for author-supplied p65 reporter trajectories and a frozen empirical predictor. Its evaluation holds out stimulus sequences, not independent experimental runs or a new biological cohort. The source matrix does not establish a run or chamber identity for every row. The empirical predictor is not inserted into the synthetic payload pathway.",
        "Showing observed and simulated traces in one playground can be useful for asking the next research question. It also makes their provenance easy to confuse. The article's synthetic campaign counts and amount residuals belong to the reference model; the measured reporter traces belong to the source study and its own evaluation contract.",
      ],
      links: [{ label: "Observed reporter data and split", href: `${CSIM_SOURCE}/docs/NFKB_DATA_MODEL.md` }],
    },
    {
      id: "what-a-reader-can-check",
      title: "What a reader can check",
      paragraphs: [
        "The Csim source, run commands, contracts, and demo screenshots are public at the linked revision. The source MAT file, generated run artifacts, and Ocura ledger are kept locally and ignored by Git. The numerical results here describe those preserved local runs; a clean checkout does not contain their receipts or logs.",
        "This is the useful scope of the integration today: a small simulator can retain its own numerical evidence while Ocura OSS keeps the execution around it inspectable. Further biological claims would need a defined observable, authenticated data and experimental units, independent evaluation, and a model actually connected to those observations.",
      ],
      links: [
        { label: "Csim source and setup", href: `${CSIM_SOURCE}/README.md` },
        { label: "Live demo runbook and local-input requirements", href: `${CSIM_SOURCE}/docs/LIVE_DEMO_RUNBOOK.md` },
      ],
    },
  ],
};
