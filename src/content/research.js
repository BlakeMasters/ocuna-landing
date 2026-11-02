import { CSIM_POST } from "./csimPost.js";
import { DREAM_RSI_POST } from "./dreamRsiPost.js";

export const RESEARCH_ART = {
  weekend: { file: "weekend/bench-logos.png", alt: "An ink-drawn raccoon peeks out from a tree beside a park bench displaying YC, four1 and Pear logo cards.", width: 1536, height: 1024, fit: "contain" },
  trail: { file: "raccoon-field-note.png", alt: "An ink-drawn raccoon reaching toward a small amber circle." },
  logs: { file: "raccoon-inspection.png", alt: "A seated raccoon examining an ochre stone between its front paws." },
  replay: { file: "raccoon-looking-back.png", alt: "A raccoon pausing to look back over its shoulder, its ringed tail curving behind it." },
  dream: { file: "dream-rsi-replay.png", alt: "A raccoon examines overlapping drawings of a branching search tree, with one recorded route traced in ochre." },
  cells: { file: "virtual-cell-evidence.png", alt: "An ink-drawn raccoon studies three schematic cells with visible nuclei, each connected to a recorded trace." },
};

export const RESEARCH_POSTS = [
  CSIM_POST,
  DREAM_RSI_POST,
  {
    "slug": "experiments-need-a-memory",
    "title": "Good experiments leave a trail",
    "category": "Engineering",
    "description": "Record a failing check, connect a correction to its reason, and reconstruct the result later with Ocura OSS 0.7.0.",
    "date": "2026-09-21",
    "dateLabel": "September 21, 2026",
    "updated": "2026-11-02",
    "updatedLabel": "November 2, 2026",
    "readTime": "6 min read",
    "art": "trail",
    "sections": [
      {
        "id": "what-survives",
        "title": "Start with a failed check",
        "paragraphs": [
          "A CI report reads eight job-attempt records and announces eight jobs. There are actually five: some failed and were retried. Fixing the aggregation is straightforward. Explaining the fix a week later takes more than the passing result. A reviewer needs the original failure, the input, the version of the reporter that produced it, and the reason for the change.",
          "We built a small example around that problem. It runs the same 31 functional checks against a buggy reporter and a completed version, retaining both outcomes. The corrected reporter groups attempts by job, uses the highest attempt number for the final outcome, accounts for retries and recovery, and rejects malformed rows.",
          "[Ocura OSS](https://protention.dev/) supplies the execution ledger: commands, outcomes, logs, and relationships between runs. The example supplies the reporter, checks, and preserved source files. Together they produce a record another person or agent can inspect without rerunning the work."
        ]
      },
      {
        "id": "run-the-example",
        "title": "Run the example",
        "paragraphs": [
          "Use Python 3.11 or later in an activated virtual environment. The walkthrough uses Ocura OSS 0.7.0 and needs no additional runtime dependencies. The scripts live on the examples branch; installing the package alone does not install them.",
          "The destination must be new, including no pre-existing empty directory. The driver copies its sources and fixture into that destination before recording the two check runs. Keep the directory afterward: it is the input to every inspection step below."
        ],
        "code": "git clone --branch examples/0.7 --single-branch https://github.com/Protention/ocura-oss.git ocura-oss-examples\ncd ocura-oss-examples\ngit checkout 7249891621c5f2d613b395b1acd2e001322209e4\npython -m pip install ocura-oss==0.7.0\npython examples/ci_report/workflow.py run --root ./ci-report-run\npython examples/ci_report/workflow.py report --root ./ci-report-run",
        "links": [
          {
            "label": "Source and setup instructions",
            "href": "https://github.com/Protention/ocura-oss/blob/7249891621c5f2d613b395b1acd2e001322209e4/examples/ci_report/README.md"
          }
        ]
      },
      {
        "id": "read-the-failure",
        "title": "Read the failure and the correction",
        "paragraphs": [
          "The starter fails all 31 checks. The completed reporter passes all 31. The report connects the passing run to the failed baseline and includes the declared reason for the correction. A shortened excerpt looks like this; the real report also includes complete run IDs and verified stderr excerpts.",
          "An expected test failure is useful evidence. A launch failure or interruption is a different outcome: the driver stops instead of treating it as a valid baseline and continuing. That distinction keeps a broken test invocation from becoming apparent evidence for the fix."
        ],
        "code": "starter: failed (0/31 checks passed; exit 1)\n  intent: Count final job outcomes by highest attempt; validate rows before emitting a summary.\ncompleted: passed (31/31 checks passed; exit 0)\n  reason: Group attempts by job, account for retries and recovery, and reject invalid rows.\nVerified 4 logs and preserved source hashes."
      },
      {
        "id": "leave-a-trail",
        "title": "Give the change a parent",
        "paragraphs": [
          "In the driver, a baseline run supplies a branch point. The corrected run names that point and gives a reason for the variation. Ocura creates the child pathway and records its command in one call. This is the relevant part of the 0.7 interface; the complete driver also preserves sources, records their digests, and labels both attempts.",
          "The guard matters. Only the expected completed test failure permits the next step. If recording later raises a storage error, inspect its execution state and known IDs before retrying: creating a pathway and executing a command is not an idempotent transaction."
        ],
        "code": "from ocura_oss import Outcome, run\n\nbaseline = run(starter_command, root=root)\nif baseline.record.outcome is not Outcome.FAILED or baseline.record.return_code != 1:\n    raise RuntimeError(\"Inspect the baseline before continuing\")\n\ncorrected = run(\n    corrected_command,\n    root=root,\n    source_branch_point_id=baseline.branch_point.id,\n    reason=\"Group attempts by job and validate input rows\",\n)",
        "links": [
          {
            "label": "The complete workflow driver",
            "href": "https://github.com/Protention/ocura-oss/blob/7249891621c5f2d613b395b1acd2e001322209e4/examples/ci_report/workflow.py"
          },
          {
            "label": "Python API and error handling",
            "href": "https://protention.dev/api/"
          }
        ]
      },
      {
        "id": "useful-memory",
        "title": "Follow the record to its evidence",
        "paragraphs": [
          "The report is a starting point for investigation. Use `runs` to discover the retained history, `show` to inspect the command and pathway, and `logs` to read verified output. Replace `RUN_ID` below with a `run_id` printed by the example report.",
          "Use a run ID to inspect output and a branch-point ID as the source of a variation. The CLI retains its older `atom_id` and `chokepoint_id` JSON keys for compatibility; the Python properties are `record` and `branch_point`. Passing the complete returned IDs avoids guessing from their names.",
          "Reading a verified log checks it against the stored record before returning its contents. The report also checks its preserved source files against their recorded digests. These are consistency checks: they do not authenticate the author or establish that the test suite covers every requirement."
        ],
        "code": "ocura-oss runs --root ./ci-report-run --all --json\nocura-oss show RUN_ID --root ./ci-report-run --command --json\nocura-oss logs RUN_ID --root ./ci-report-run --stream stderr",
        "links": [
          {
            "label": "CLI reference",
            "href": "https://protention.dev/cli/"
          }
        ]
      },
      {
        "id": "return-to-the-work",
        "title": "Return without rerunning",
        "paragraphs": [
          "Once the writers have stopped, the preserved driver can reconstruct the report using only the retained project directory. It reads the saved evidence; it does not execute the checks again. Keep the whole directory if you copy it elsewhere.",
          "This gives a future collaborator a concrete chain: a failure, a declared reason, a related correction, and the output supporting the result. An agent can follow that chain through its existing shell or Python environment. The reason records what the caller said it intended; it does not infer every motivation behind the change.",
          "The same pattern extends to training experiments. A workload can retain checkpoints and validation results while Ocura records the commands and their lineage. Our Dream-RSI example uses those records both to choose the next attempt and to reconstruct the choices afterward."
        ],
        "code": "python ci-report-run/sources/workflow.py report --root ./ci-report-run\nocura-oss verify --root ./ci-report-run --archive",
        "links": [
          {
            "label": "A Dream-RSI workflow with Ocura OSS",
            "href": "/research/dream-rsi-with-ocura-oss"
          },
          {
            "label": "State and verification",
            "href": "https://protention.dev/state/"
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
    image: `/research/${RESEARCH_ART.weekend.file}`,
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
