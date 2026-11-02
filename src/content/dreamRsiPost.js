export const DREAM_RSI_POST = {
  "slug": "dream-rsi-with-ocura-oss",
  "title": "A Dream-RSI workflow with Ocura OSS",
  "category": "Engineering",
  "description": "How we used Ocura OSS to record training experiments with agents, try policies against saved results, and understand what the pilot showed.",
  "date": "2026-09-22",
  "dateLabel": "September 22, 2026",
  "updated": "2026-11-02",
  "updatedLabel": "November 2, 2026",
  "readTime": "8 min read",
  "art": "dream",
  "sections": [
    {
      "id": "from-paper-to-workflow",
      "title": "Keep track of what changed",
      "paragraphs": [
        "A training run returns a lower validation loss. To decide what to do next, you need more than that number: which checkpoint it resumed, how long it trained, and what changed since the last attempt.",
        "In our Dream-RSI example, one agent proposes learning-rate schedules. A second agent rewrites a policy: the rule that decides which training attempt to try next. Ocura OSS records their commands and results, along with how the runs relate to one another. The example handles the training, checkpoints, and agent calls.",
        "The walkthrough below uses Ocura OSS 0.7.0. The results at the end come from our September 22, 2026 pilot on 0.4.0. That pilot completed the whole loop, but the lower losses weren't enough to show that policy revision helped. The saved history let us work out why."
      ]
    },
    {
      "id": "recorded-choices",
      "title": "Try a policy against saved results",
      "paragraphs": [
        "As attempts finish, their history forms a tree of choices and results. In this Dream-RSI adaptation, we use that tree to try alternative policies. A policy chooses a branch, and replay returns the recorded result if one exists. We can compare policies this way without asking an agent for another candidate or launching another training job.",
        "We adapted the approach in section 3 of the paper to a small nanoGPT model trained on Tiny Shakespeare. The discovery agent writes `learning_rate(step, total_steps)` functions within fixed limits. The policy agent revises `choose(observation)`, which chooses the next attempt. A proposed policy competes with the current policy on the saved history; the winner then guides a new training search.",
        "Replay can't answer a question the saved runs never tested. If a policy asks to continue a branch beyond the recorded work, there's no result to return. Doing that in a live run needs a new agent call and training attempt. That gap matters when the score also counts the cost of attempts."
      ],
      "links": [
        {
          "label": "Dream-RSI: Recursive Self-Improvement through Evolving Worlds",
          "href": "https://arxiv.org/pdf/2609.14858"
        },
        {
          "label": "Replay and selection implementation",
          "href": "https://github.com/Protention/ocura-oss/blob/7249891621c5f2d613b395b1acd2e001322209e4/examples/dream_rsi/README.md#replay"
        }
      ]
    },
    {
      "id": "recording-attempts",
      "title": "Record each attempt",
      "paragraphs": [
        "The controller runs both agent requests and training jobs as commands, so it can record them through the same `run()` call. To continue an earlier attempt, it passes that attempt's branch point and a reason for the change. This helper returns the new execution and its verified output. The complete controller also records request hashes and enforces time and call limits.",
        "Check `execution.record.outcome` before using the output: a failed command can still write to stdout. Its stderr can help explain the failure. If Ocura reports a storage error, keep the execution IDs and inspect what happened before trying again; the command may already have run."
      ],
      "code": "from ocura_oss import Store, run\n\ndef record_attempt(root, command, parent):\n    execution = run(\n        command,\n        root=root,\n        source_branch_point_id=parent.branch_point.id,\n        reason=\"refine candidate\",\n    )\n    store = Store(root)\n    stdout = store.read_verified_log(run_id=execution.record.id)\n    stderr = store.read_verified_log(\n        run_id=execution.record.id, stream=\"stderr\"\n    )\n    return execution, stdout, stderr",
      "links": [
        {
          "label": "The controller and record_command adapter",
          "href": "https://github.com/Protention/ocura-oss/blob/7249891621c5f2d613b395b1acd2e001322209e4/examples/dream_rsi/experiment.py"
        },
        {
          "label": "Ocura OSS Python API",
          "href": "https://protention.dev/api/"
        }
      ]
    },
    {
      "id": "restoring-training",
      "title": "Resume the training state",
      "paragraphs": [
        "Continuing a training run takes more than its place in the history. It needs the model parameters, AdamW optimizer state, update counter, CPU random state, and batch-generator state. The example saves these together in a checkpoint and checks its hash before loading it.",
        "The CPU test stops and resumes training, then compares it with an uninterrupted run across the same schedule change. The model, optimizer, and random states must match exactly in that runtime. Other checks reject damaged checkpoints and confirm that evaluating a checkpoint doesn't change the saved file.",
        "During the search, agents see validation results. The test split stays out of the process until the policy and checkpoints have been chosen. That prevents test results from influencing those choices."
      ],
      "links": [
        {
          "label": "How the example saves and restores training",
          "href": "https://github.com/Protention/ocura-oss/blob/7249891621c5f2d613b395b1acd2e001322209e4/examples/dream_rsi/rsi_training.py"
        },
        {
          "label": "CPU continuation tests",
          "href": "https://github.com/Protention/ocura-oss/blob/7249891621c5f2d613b395b1acd2e001322209e4/tests/test_dream_rsi_training.py"
        }
      ]
    },
    {
      "id": "try-the-workflow",
      "title": "Try it locally",
      "paragraphs": [
        "Start in an activated Python 3.12 virtual environment, which supports the CPU training dependencies used here. Clone the examples catalog, select the revision below, and install the released package. By default, these tests use small stand-ins for the agents and training jobs. They check how the parts fit together without remote calls or model training.",
        "To try real training, follow the setup guide to install CPU PyTorch and prepare the exact nanoGPT and Tiny Shakespeare inputs used by the example. The separate Dream replay walkthrough uses fixed training recipes, so you can try collection, replay, and a new training run without an agent account."
      ],
      "code": "git clone --branch examples/0.7 --single-branch https://github.com/Protention/ocura-oss.git ocura-oss-examples\ncd ocura-oss-examples\ngit checkout 7249891621c5f2d613b395b1acd2e001322209e4\npython -m pip install ocura-oss==0.7.0\npython -m unittest discover -s tests -p \"test_dream_rsi_*.py\" -v",
      "links": [
        {
          "label": "CPU setup and live-run instructions",
          "href": "https://github.com/Protention/ocura-oss/blob/7249891621c5f2d613b395b1acd2e001322209e4/examples/dream_rsi/README.md#setup"
        },
        {
          "label": "Fixed-recipe replay without remote agents",
          "href": "https://github.com/Protention/ocura-oss/blob/7249891621c5f2d613b395b1acd2e001322209e4/examples/dream_replay/README.md#first-run-smoke-profile"
        }
      ]
    },
    {
      "id": "run-with-agents",
      "title": "Add live agents",
      "paragraphs": [
        "Once `.tmp-tests/dream-inputs` is prepared, you can try the live loop with a signed-in Codex CLI that supports the flags listed in the guide. Replace `MODEL` with a model available to your account. This small smoke run uses two training updates per attempt, up to seven agent calls, and an eight-minute controller time budget. Much of that time can go to startup, agent responses, or waiting for the host to have capacity.",
        "Use a directory that doesn't exist yet. If the run stops, keep its files so you can inspect them; the example doesn't resume or retry automatically. This is a quick integration check. Two updates per attempt won't tell you whether a policy improves training.",
        "For 0.7.0, we've run the local tests and real CPU training and replay checks. We haven't repeated the live-agent pilot. Those results are from September."
      ],
      "code": "python examples/dream_rsi/experiment.py run --root .tmp-tests/dream-rsi-smoke --prepared .tmp-tests/dream-inputs --profile smoke --model MODEL --effort low --seed 101 --rounds 2 --attempts 2 --updates 2 --policy-revisions 1 --max-agent-calls 7 --max-seconds 480\npython examples/dream_rsi/experiment.py report --root .tmp-tests/dream-rsi-smoke",
      "links": [
        {
          "label": "Run options and resource limits",
          "href": "https://github.com/Protention/ocura-oss/blob/7249891621c5f2d613b395b1acd2e001322209e4/examples/dream_rsi/README.md#run"
        }
      ]
    },
    {
      "id": "debugging-evidence",
      "title": "Read the result after the run",
      "paragraphs": [
        "The report verifies the records and reads the saved output. It checks the experiment settings, checkpoint hashes, and policy choices, including whether the policy chosen during replay was actually used in the next search. You can rebuild this report without calling an agent or importing PyTorch.",
        "Keep the whole experiment directory, including requests and checkpoints. If you move a finished run, follow the guide's archive instructions and provide the original root so the report can find the saved checkpoints.",
        "This helped during development when agents timed out or a busy machine delayed work. We could see what had finished before each stop, separate those problems from training failures, and account for the failed attempts when adding up the costs."
      ],
      "links": [
        {
          "label": "Report reconstruction and archive handling",
          "href": "https://github.com/Protention/ocura-oss/blob/7249891621c5f2d613b395b1acd2e001322209e4/examples/dream_rsi/README.md#inspect-intention-and-failures"
        }
      ]
    },
    {
      "id": "completed-run",
      "title": "What the September pilot showed",
      "paragraphs": [
        "In the September pilot, the first policy revision won the replay comparison and guided new training runs. A second revision tied, so the first stayed in use. The loop finished in just under eight minutes, after 17 agent calls and 15 training attempts.",
        "The chosen policy reached lower test loss on both new seeds. Looking at the records showed that it spent all 48 available updates continuing one branch. The fixed control spent 32 updates on a branch and 16 on a restart. Training one branch longer could explain the lower losses; the experiment didn't establish a benefit from revising the policy.",
        "The replay score needed a closer look too. Its 0.01 improvement came from requesting a continuation missing from the saved tree. That revealed no better training result, but left one fewer recorded attempt to count against the cost term. In a live run, the agent still had to generate and train that continuation. The higher replay score wasn't evidence of saved computation.",
        "Including the six development runs and diagnostics, we recorded 54 agent calls and 43 completed training attempts. Seven earlier calls had no usage report, so the total token counts are incomplete. The published files summarize the measurements but omit the raw ledgers, checkpoints, and agent responses. They aren't enough to independently reconstruct that historical run."
      ],
      "links": [
        {
          "label": "Historical pilot results, controls, and costs",
          "href": "https://github.com/Protention/ocura-oss/blob/fe8f336b4be97c4ffb0ea818756d13da8189b72b/examples/dream_rsi/RESEARCH_NOTES.md"
        },
        {
          "label": "Curated September 22 measurement summary",
          "href": "https://github.com/Protention/ocura-oss/blob/fe8f336b4be97c4ffb0ea818756d13da8189b72b/examples/dream_rsi/evidence-summary.json"
        }
      ]
    },
    {
      "id": "package-boundary",
      "title": "What we would test next",
      "paragraphs": [
        "The records helped us explain what the promising numbers meant. We could rebuild the report and follow each policy choice into later training runs. That showed where the extra training went and why the replay score rose.",
        "To find out whether policy revision helps, the next study should include simpler live controls, such as greedy selection and always continuing the same branch. It also needs more test seeds and enough training for the allocation choices to matter. The current example provides the code and setup for running those comparisons and keeping the evidence needed to assess them."
      ],
      "links": [
        {
          "label": "Current Dream-RSI example",
          "href": "https://github.com/Protention/ocura-oss/blob/7249891621c5f2d613b395b1acd2e001322209e4/examples/dream_rsi/README.md"
        },
        {
          "label": "A smaller walkthrough: Good experiments leave a trail",
          "href": "/research/experiments-need-a-memory"
        }
      ]
    }
  ]
};
