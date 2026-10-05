export const HOME = {
  headline: "Accelerating Uncertain computation",
  headlineLead: "Accelerating",
  introduction:
    "Ocuna builds the execution layer for AI workloads that branch as they run. From model training to agent research, we’re building systems that coordinate work and keep their decisions on the record.",
  partnersTitle: "Thank you to our partners",
  partners: [
    { name: "Antler", id: "antler", href: "https://www.antler.co/", logo: "partners/antler.svg", width: 117, height: 28 },
    { name: "UCSF", id: "ucsf", href: "https://www.ucsf.edu/", logo: "partners/ucsf.svg", width: 802, height: 393 },
    { name: "Stanford", id: "stanford", href: "https://www.stanford.edu/", logo: "partners/stanford.png", width: 426, height: 91 },
  ],
  runtimeTitle: "Compute follows the work.",
  runtimeIntroduction:
    "Ocura directs compute across an execution frontier. The scheduler places work, holds budgets, and reuses results across training and inference branches. You build the pipeline; the runtime governs what runs, what waits, and what continues.",
  executionTitle: "Explore the execution graph.",
  executionIntroduction:
    "An illustrative Python run pauses at a chokepoint, opens a review branch, and keeps each output connected to its path.",
  capabilities: [
    {
      id: "training",
      title: "Training",
      heading: "Explore more than one path.",
      description:
        "Coordinate checkpoint, data, and parameter branches. Keep each run tied to its budget and the evidence behind its continuation.",
      href: "#ocura",
      action: "Explore the execution graph",
    },
    {
      id: "inference",
      title: "Inference",
      heading: "Direct a changing frontier.",
      description:
        "Coordinate serving pools, agent endpoints, and tools under explicit policy. Keep escalation, preemption, and continuation traceable.",
      href: "#ocura",
      action: "Explore the execution graph",
    },
    {
      id: "records",
      title: "Run records",
      heading: "Keep the decisions with the result.",
      description:
        "Ocura OSS records local command runs and their lineage. Branch from a baseline, compare outcomes, and inspect the record behind a result.",
      href: "/docs/state",
      action: "Read about run records",
    },
  ],
};
