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
    "description": "Use Ocura OSS 0.7.0 to keep a failed test, the fix, and the reason for the change together, ready for the next person who picks up the work.",
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
          "A CI-reporting script says eight jobs ran. There were only five: some were retried, and the script counted every attempt as a separate job. To explain the fix a week later, you need the input that exposed the bug, both versions of the script, and the test results.",
          "Our example includes two versions of that reporter: an intentionally buggy starter and a fixed version. A local script runs the same tests against each and saves both results. The fixed reporter groups attempts by job, uses the highest attempt number to determine the final outcome, and checks for invalid input.",
          "[Ocura OSS](https://protention.dev/) records the commands, results, logs, and connection between the two runs. The example also saves copies of its source files and sample input. That gives the next person or agent enough context to follow the change without running the tests again."
        ]
      },
      {
        "id": "run-the-example",
        "title": "Run the example",
        "paragraphs": [
          "Start in an activated virtual environment with Python 3.11 or later. Clone the examples branch and install Ocura OSS 0.7.0 using the commands below. You don't need any other Python packages. The checkout provides the example scripts, which are distributed separately from the package.",
          "Choose a directory name that doesn't exist yet; the script will create it. It saves the reporter, tests, and sample input there before running the checks. Keep that directory for the inspection steps below."
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
        "title": "See the failure and the fix",
        "paragraphs": [
          "The first run is supposed to fail: the starter has the bug we're demonstrating. It fails all 31 checks, while the fixed version passes all 31. These are local checks of the example reporter. When both runs produce those expected results, the workflow reports `complete`.",
          "The report links the passing run to the original failure and includes the reason for the fix. Here's a shortened excerpt. The full report also includes run IDs and the saved error output."
        ],
        "code": "starter: failed (0/31 checks passed; exit 1)\n  intent: Count final job outcomes by highest attempt; validate rows before emitting a summary.\ncompleted: passed (31/31 checks passed; exit 0)\n  reason: Group attempts by job, account for retries and recovery, and reject invalid rows.\nVerified 4 logs and preserved source hashes."
      },
      {
        "id": "leave-a-trail",
        "title": "Connect the fix to the failed run",
        "paragraphs": [
          "After the baseline finishes, Ocura returns a branch point: a reference you can use when trying another version. Pass that reference and a reason to `run()` to connect the fix to the original failure. Ocura creates a new pathway and records the command in one call.",
          "This excerpt shows the connection. The first check stops an interrupted run or an unexpected exit status from becoming the baseline for the fix. The complete driver also saves the source files and their hashes, then labels both attempts.",
          "If Ocura reports a storage error, inspect the run IDs and execution details in the error before retrying. The command may already have started, and repeating the call creates another attempt."
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
        "title": "Inspect what happened",
        "paragraphs": [
          "To look closer, use `runs` to list the history, `show` to inspect a command and its pathway, and `logs` to read its output. Replace `RUN_ID` below with a `run_id` from the example report.",
          "A run ID identifies the execution and its output. A branch-point ID is the reference you pass when starting a variation. For compatibility, the CLI's JSON still uses the older names `atom_id` and `chokepoint_id`; the Python properties are `record` and `branch_point`. Use the full IDs returned by the tools.",
          "Ocura checks the logs against their recorded hashes before returning them. The example checks its saved source files the same way. These checks tell you whether the files match the record; they don't establish who wrote them or whether the tests cover every requirement."
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
        "title": "Pick up the work later",
        "paragraphs": [
          "After the run finishes and nothing is writing to the directory, you can rebuild the report from the saved copy of the driver. This reads the existing files without running the tests again. If you move the project, keep the whole directory together.",
          "A future collaborator can now follow the failure, the reason for the change, and the passing result. An agent can do the same through its shell or Python environment. The explanation still comes from the caller: Ocura records the reason you give it.",
          "Training experiments can use the same approach. The training code saves checkpoints and validation results, while Ocura records the commands and how the runs relate. Our Dream-RSI example uses that history to choose the next attempt and explain the choices afterward."
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
