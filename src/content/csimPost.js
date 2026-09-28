const CSIM_SOURCE = "https://github.com/BlakeMasters/csim/blob/a8a1b124540129440dada5835b973166b2d2627f";
const FOUR_ONE_SOURCE = "https://github.com/BlakeMasters/four-one";
const YC_EVENT = "https://events.ycombinator.com/gbrain-qm-river-memorable-hackathon";
const HEALTHCARE_EVENT = "https://luma.com/e9z9vuxz";

export const CSIM_POST = {
  slug: "double-hackathon-weekend",
  title: "Double Hackathon Weekend",
  category: "Engineering",
  description:
    "Connecting research across machines and providers with four1, exploring cellular responses with Csim, and reusing Ocura OSS across both builds.",
  date: "2026-09-27",
  dateLabel: "September 27, 2026",
  readTime: "4 min read",
  art: "weekend",
  sections: [
    {
      id: "four-one",
      title: "four1: research across machines and providers",
      figures: [
        {
          layout: "event",
          theme: "dark",
          marks: [
            { file: "weekend/four-one.png", alt: "four1", width: 1254, height: 1254, kind: "project", href: FOUR_ONE_SOURCE },
            { file: "weekend/yc.svg", alt: "Y Combinator", width: 48, height: 48, kind: "host", href: "https://www.ycombinator.com/" },
          ],
          image: {
            file: "weekend/own-your-intelligence.png",
            alt: "Own Your Intelligence Hackathon announcement, showing a grid of gray tiles and September 27 in San Francisco.",
            width: 1320,
            height: 1539,
            href: YC_EVENT,
          },
          caption: "four1 at the Own Your Intelligence Hackathon, September 27. Announcement screenshot from Garry Tan’s post.",
          credit: { label: "YC event page", href: YC_EVENT },
        },
      ],
      paragraphs: [
        "Two hackathons over September 26–27 brought together two projects: four1, a network designed to connect research sessions across machines and model providers, and Csim, a foundation for cellular simulation. Both were built with coding agents. Both also needed a reliable way to retain experiment attempts while their application code changed. Ocura OSS supplied the execution ledger in each.",
        "For Sunday’s Own Your Intelligence Hackathon at YC, four1 was designed for cross-machine, cross-provider communication over a shared research network. Node A and Node B can use different agent harnesses and model providers on their owners’ computers, keeping their accounts, runtimes and private histories local. The goal is an automatic research network in which registered sessions can find related work, exchange selected context and request contributions.",
        "Participants register the work they want to share in four1 and pair their nodes through project invitations. four1 authenticates requests with project access grants, giving authorized peers access to registered records and approved context. This provides a common communication layer across providers, with each node retaining control of what it shares and what work it runs.",
        "The code itself provides a starting point. A contributor registers completed work against a repository, commit and exact file. Another node can look up that code and request context associated with the matching session. The contributor’s selected explanation can preserve the original problem, constraints, alternatives considered and evidence behind a decision. A later reviewer can use that creation context to understand why the code took its present form.",
        "Once the contributor approves an excerpt for automatic sharing, their running node can answer subsequent authorized requests without reopening the original chat or asking them to repeat the explanation. The current prototype supports this direct lookup and automatic return of selected context between paired nodes. Fourboard also carries project messages to participating nodes, where owners can select them for further contributions. New agent work follows the owning node’s execution policy.",
        "The broader aim is a research network that grows with each registered session. New investigations can discover prior work, reuse its shared context and request further contributions across harnesses. Today, discovery and approved context retrieval work between explicitly paired, reachable nodes; coordinating new agent work automatically is a further step.",
        "The local demonstration exercised the research exchange across two separate harnesses. An agent on Node A proposed a pulse-and-recovery experiment. A synthetic fixture ran through Ocura OSS, and its verified output went to an agent on Node B for review. The agent on Node A then used the returned critique to revise the proposed experiment with additional controls and calibration checks. Both nodes ran on one computer; testing on separate computers is next.",
        "Ocura OSS supplies the execution evidence within this network. four1’s worker records an experiment, reads verified output and attaches a receipt to the task; the server checks the ledger before marking the experiment complete. four1 connects the selected context, contribution and resulting artifact, while Ocura OSS retains the record of what ran. Together, those records let a reviewer inspect both an experiment’s output and the context used to decide the next step.",
      ],
      links: [
        { label: "Explore four1", href: FOUR_ONE_SOURCE },
        { label: "Session discovery and automatic context replies", href: FOUR_ONE_SOURCE + "/blob/d16b2b9f0568a75e7a964969e664ffa9efe0df4a/docs/networking.md" },
      ],
    },
    {
      id: "csim",
      title: "Csim: exploring how cells respond",
      figures: [
        {
          layout: "screenshot",
          image: {
            file: "weekend/csim-playground.jpg",
            alt: "Csim’s virtual-cell playground with three cells sharing a stimulus field and an inspector showing the selected cell’s before-and-after state.",
            width: 1265,
            height: 712,
            href: CSIM_SOURCE + "/docs/images/virtual-cell-interaction.jpg",
          },
          caption: "Three virtual cells after 12 accepted intervals. The inspector exposes state changes and the accepted transfer trace in this synthetic local demo.",
        },
        {
          layout: "event",
          theme: "light",
          marks: [
            { file: "weekend/pear-vc.png", alt: "Pear VC", width: 900, height: 900, kind: "host", href: "https://pear.vc/" },
          ],
          image: {
            file: "weekend/healthcare-ai-hackathon.jpg",
            alt: "Healthcare AI Hackathon artwork for September 26 at AWS Builder Loft, with Pear VC, NEA and Cathay Innovation listed as hosts.",
            width: 800,
            height: 800,
            href: HEALTHCARE_EVENT,
          },
          caption: "Saturday’s Healthcare AI Hackathon at AWS Builder Loft, presented by Pear VC, NEA and Cathay Innovation.",
          credit: { label: "Healthcare event page and artwork", href: HEALTHCARE_EVENT },
        },
      ],
      paragraphs: [
        "Saturday’s Healthcare AI Hackathon provided the setting for Csim. Its longer-term aim is to learn how cells respond to their environment and interventions, then use those responses within a larger biological simulation. Shared models that adapt across cell types and eventually individual subjects are a research direction; the current work establishes the simulation and evaluation foundation.",
        "The local playground makes that foundation tangible. You can step one to five virtual cells through a shared environment, vary stimulus and payload delivery, and inspect what changed in each accepted interval. Paired response views compare schedules, while recorded campaigns collect results across multiple conditions. Observed p65 trajectories are displayed separately from synthetic cell-response traces.",
        "Csim’s integrated demo already had to produce traces, check amount balances, hash result artifacts and evaluate numerical outputs. It uses ocura-oss run --json to record the command, outcome and logs, then ocura-oss verify --json to check the saved history. That execution record sits alongside Csim’s own checks.",
        "One preserved attempt shows why that distinction matters: Ocura OSS’s logs verified, but Csim rejected the receipt because source files changed during execution. A later run accepted all 13 demo components and verified 64 logs. Both attempts remained inspectable. These checks support the local implementation; biological calibration and validation remain future work.",
      ],
      links: [
        { label: "Explore Csim and its demo views", href: "https://github.com/BlakeMasters/csim" },
        { label: "Integrated demo results and limits", href: CSIM_SOURCE + "/docs/INTEGRATED_DEMO.md" },
      ],
    },
    {
      id: "reusing-the-ledger",
      title: "What both projects reused",
      paragraphs: [
        "The common implementation work was command recording: arguments, exit status, timing, stdout and stderr, persistent identifiers, and checks for changed logs. Both projects could use the same package interface for that layer. Csim called the CLI; four1 connected a Python worker to its task service. Each application still needed an adapter and its own result checks.",
        "That is a useful reduction in scope when building with agents. The project can specify which workload to run and what its output means while reusing an established record format and verification path. We did not measure hours or tokens saved, but the code shows which responsibilities stayed in the applications and which came from Ocura OSS.",
        "Experiment storage earns its place when those records are used again. In Csim, they preserve a failed attempt and the successful rerun for inspection. In four1, a saved result can travel with its receipt into another harness, alongside the selected context that explains the work. The receiving session has both the result and an inspectable basis for its next contribution.",
        "Ocura OSS records and verifies local execution evidence. The applications decide which artifacts to retain or share, how to interpret results, and what should happen next. Across two different builds, that boundary let the experiment history remain consistent while the surrounding software took shape.",
      ],
      links: [
        { label: "Ocura OSS documentation", href: "/docs" },
        { label: "Why experiments need a record", href: "/research/experiments-need-a-memory" },
      ],
    },
  ],
};
