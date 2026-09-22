import { DREAM_RSI_POST } from "./dreamRsiPost.js";

export const RESEARCH_ART = {
  trail: { file: "raccoon-field-note.png", alt: "An ink-drawn raccoon reaching toward a small amber circle." },
  logs: { file: "raccoon-inspection.png", alt: "A seated raccoon examining an ochre stone between its front paws." },
  replay: { file: "raccoon-looking-back.png", alt: "A raccoon pausing to look back over its shoulder, its ringed tail curving behind it." },
  dream: { file: "dream-rsi-replay.png", alt: "A raccoon examines overlapping drawings of a branching search tree, with one recorded route traced in ochre." },
};

export const RESEARCH_POSTS = [
  DREAM_RSI_POST,
  {
    slug: "experiments-need-a-memory",
    title: "Good experiments leave a trail",
    category: "Field notes",
    description: "Recording commands, output, and the relationships between attempts makes experimental work easier to inspect and continue.",
    date: "2026-09-21",
    dateLabel: "September 21, 2026",
    readTime: "3 min read",
    art: "trail",
    sections: [
      {
        id: "what-survives",
        title: "The record",
        paragraphs: [
          "A training script reports a lower validation loss. To decide whether to keep the change, a collaborator needs the command that produced it, the configuration it used, and the output from the earlier run. A score copied into a notebook captures only part of that comparison.",
          "Ocura OSS records local command attempts, their outcomes, and their stdout and stderr. Each attempt has a persistent identifier and a place in the experiment history. A reader can return to the saved output after the terminal closes, inspect an error, or trace a later variation back to its source.",
          "Failed attempts belong in that history too. An invalid configuration or a process that could not start explains why a promising idea was abandoned. Retaining the outcome and available diagnostics gives the next person something more useful than an unexplained gap between successful runs."
        ]
      },
      {
        id: "leave-a-trail",
        title: "Following a change",
        paragraphs: [
          "Suppose the next experiment changes the batch size. The baseline provides a terminal record, called a chokepoint, from which the caller can create a branch. The branch names its source and records a reason for the variation. Running the new command on that branch connects the result to the decision that led to it.",
          "Parameter labels describe the intended change. The training command must also pass the new batch size through its own arguments or configuration file: recording a label does not configure the workload. Keeping the labels and command inputs aligned lets a reader see both the intended variation and how it was applied.",
          "For a continuation, the training program saves and restores its checkpoint, including the optimizer and random state it needs. The branch records ancestry; the workload restores execution state. A checkpoint identifier in the recorded output connects the experiment history to the artifact used for the next run."
        ]
      },
      {
        id: "useful-memory",
        title: "Using the evidence",
        paragraphs: [
          "Saved output can also become input to another program. A controller might read a validation score, choose an attempt to continue, and record its next command. Store.read_verified_log() returns the selected output bytes after checking their size and digest against the saved record. The caller then parses the output and applies the decision rule appropriate to the experiment.",
          "Store.verify_state() checks the complete local history, including record relationships and referenced logs. These checks establish consistency between the records and their output. Evaluating the reported result still requires the workload, data, and comparison that gave the number meaning.",
          "Our Dream-RSI example uses this sequence for agent calls, training jobs, and policy evaluations. Their records let us reconstruct what ran and inspect the output used by the controller. The same history supports both an automated decision during the experiment and a review of that decision afterward."
        ],
        links: [
          {
            label: "A Dream-RSI workflow with Ocura OSS",
            href: "/research/dream-rsi-with-ocura-oss"
          },
          {
            label: "Ocura OSS documentation",
            href: "/docs"
          }
        ]
      }
    ]
  },
];

export const RESEARCH_ROUTES = [
  "/research",
  ...RESEARCH_POSTS.map((post) => `/research/${post.slug}`),
];

export const getResearchPost = (route) =>
  RESEARCH_POSTS.find((post) => route === `/research/${post.slug}`);

export const RESEARCH_META = {
  "/research": {
    title: "Field Notes — Ocuna Research",
    image: "/research/dream-rsi-replay.png",
    description:
      "Notes from Ocuna on experimental infrastructure, verified evidence, and the decisions between training runs.",
  },
  ...Object.fromEntries(
    RESEARCH_POSTS.map((post) => [
      `/research/${post.slug}`,
      {
        title: `${post.title} — Ocuna Research`,
        description: post.description,
        image: `/research/${RESEARCH_ART[post.art].file}`,
        type: "article",
      },
    ]),
  ),
};
