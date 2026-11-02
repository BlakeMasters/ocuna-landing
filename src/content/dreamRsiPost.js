export const DREAM_RSI_POST = {
  "slug": "dream-rsi-with-ocura-oss",
  "title": "A Dream-RSI workflow with Ocura OSS",
  "category": "Engineering",
  "description": "Build a recorded training search, replay its choices, and inspect a fresh run. A practical 0.7.0 walkthrough with the historical pilot and its limits.",
  "date": "2026-09-22",
  "dateLabel": "September 22, 2026",
  "updated": "2026-11-02",
  "updatedLabel": "November 2, 2026",
  "readTime": "8 min read",
  "art": "dream",
  "sections": [
    {
      "id": "from-paper-to-workflow",
      "title": "Make the next decision inspectable",
      "paragraphs": [
        "An agent proposes a learning-rate schedule, a training job returns a validation loss, and a controller decides which branch to continue. After several rounds, a lower loss is only one part of the result. Which checkpoint did the job resume? What feedback did the policy see? Did the selected policy actually guide the next run?",
        "We built a small Dream-RSI adaptation to keep those questions answerable. One agent writes schedules; another revises the code that allocates training attempts. Ocura OSS records their commands, results, and lineage. The application owns checkpoint restoration, replay, scoring, and agent access.",
        "The walkthrough below uses Ocura OSS 0.7.0. The pilot discussed later was completed on September 22, 2026 with 0.4.0. It exercised the complete loop, but its lower losses did not establish useful policy improvement. The retained history helped explain why."
      ]
    },
    {
      "id": "recorded-choices",
      "title": "Turn a search history into replay",
      "paragraphs": [
        "Dream-RSI treats recorded discovery history as a simulator for an exploration policy. A history contains a tree of attempts with parents, evaluation feedback, and outcomes. During replay, a policy chooses branches and receives only the outcomes revealed by those choices. Evaluating a policy on that saved tree requires no new discovery-agent call or training job.",
        "Our adaptation follows section 3 of the paper using a small nanoGPT model and Tiny Shakespeare data. A fixed discovery agent proposes bounded `learning_rate(step, total_steps)` functions. A policy agent revises a stateless `choose(observation)` function. Replay compares the revision with the incumbent; a selected policy then guides a fresh search.",
        "A saved tree covers only work that was recorded. If a policy asks for an absent continuation, replay reveals no result. A live search must actually generate and train that candidate. That difference becomes important when the objective also counts attempts."
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
      "title": "Record agent calls and training jobs the same way",
      "paragraphs": [
        "Both kinds of work are commands. The controller records each command and links a continuation to its parent’s branch point. In 0.7, the combined run call creates that relationship and executes the new attempt. This small helper illustrates the boundary; the full adapter also hashes requests and enforces its execution budgets.",
        "The returned outcome remains essential. Successfully reading stdout does not mean the workload passed. A caller should inspect `execution.record.outcome` and the verified stderr before accepting a result. If storage fails, preserve the known execution IDs and investigate instead of automatically submitting the command again."
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
      "title": "Keep checkpoint restoration in the workload",
      "paragraphs": [
        "A branch records ancestry. Continuing training also needs the model parameters, AdamW state, update counter, CPU random state, and batch-generator state. The training adapter saves those together and checks the checkpoint digest before loading it.",
        "The CPU continuation test compares split training with uninterrupted training across a schedule change. It checks exact model, optimizer, and random states in that runtime. Separate checks protect held-out checkpoint bytes and reject corrupted input. The package refresh reruns these mechanics against installed 0.7.0; it does not turn the historical pilot into a new efficacy result.",
        "Agents receive validation feedback during search. Held-out test evaluation happens after discovery and policy selection, using checkpoints chosen by validation. This keeps test outcomes out of the information available to the policy."
      ],
      "links": [
        {
          "label": "Training adapter and continuation contract",
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
      "title": "Start with the local checks",
      "paragraphs": [
        "Use an activated Python 3.12 virtual environment for the pinned CPU training dependencies. Clone the examples catalog, select the revision below, and install the released package. The default RSI tests use synthetic agents and evaluators: they make no remote calls and do not train a model.",
        "For training, follow the setup guide to install CPU PyTorch and prepare the pinned nanoGPT and Tiny Shakespeare inputs. The separate fixed-recipe Dream replay walkthrough exercises collection, replay, and fresh execution without an agent account."
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
      "title": "Run a bounded agent experiment",
      "paragraphs": [
        "After preparing `.tmp-tests/dream-inputs`, a live run needs a signed-in Codex CLI with the flags listed in the guide. Replace `MODEL` with a model available to your account. This command requests the smoke configuration: two training updates per attempt, up to seven agent calls, and a 480-second controller allowance. Startup, inference, and host-capacity checks can dominate such a small training workload.",
        "Use a new destination and keep an interrupted run for inspection. The example has no automatic resume or retry. The smoke run checks integration; its training budget is too small to support a learning-quality claim. The current 0.7 qualification covers synthetic-agent contracts and real CPU training checks; the historical pilot below remains the live-agent result."
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
      "title": "Reconstruct the decision afterward",
      "paragraphs": [
        "The report first verifies ledger records and reads their retained output. It then checks the experiment configuration, checkpoint digests, and policy choices, including whether the policy selected in replay was deployed in the next search. Reporting does not call an agent or import PyTorch.",
        "Keep the complete experiment directory, including requests and checkpoints. A settled archive can be read without temporary log locks. If the project moved, the guide explains how to supply its original root so recorded checkpoint paths can be mapped safely.",
        "During the original development, this record separated agent timeouts and capacity deferrals from training failures. We could inspect work completed before each stop, revise the policy prompt, and retain the cost of the failed development attempts."
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
        "The 0.4.0 pilot completed in 475.875 seconds with 17 agent calls, 15 training attempts, two policy revisions, and four held-out evaluations. Its reconstructed report verified 80 execution records, 160 logs, and 20 checkpoints. The first generated policy won replay selection and guided fresh training; the second revision tied, so the incumbent stayed.",
        "The selected policy reached lower test loss on both fresh seeds. It also spent all 48 available updates continuing one branch. The fixed control spent 32 updates on a branch and 16 on a restart. The comparison therefore did not isolate a benefit from policy evolution: simply training one branch longer remained an explanation.",
        "Replay exposed a second issue. The policy’s 0.01 score gain came from requesting a continuation missing from the saved tree. No better training result was revealed, but one fewer recorded attempt counted against the cost term. Live execution had to generate and train that continuation. The apparent replay gain did not demonstrate saved computation.",
        "Across six development runs and diagnostics, we retained 54 agent calls and 43 completed training attempts. Seven earlier calls lacked usage reports, so aggregate token counts are lower bounds. The published summary contains curated measurements; it does not include the raw ledgers, checkpoints, or agent responses needed to independently reconstruct the historical run."
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
      "title": "What to carry into the next experiment",
      "paragraphs": [
        "The useful result was an inspectable implementation. Agent calls, training, replay selection, and fresh deployment shared an execution record, and the report could be rebuilt after the run. That made it possible to trace a promising number back to the allocation and accounting choices that produced it.",
        "A stronger efficacy study needs live greedy and always-continue controls, more held-out seeds, and a workload with meaningful allocation choices. Ocura can retain those comparisons; the experiment still has to make them. The current source and setup guide provide the starting point for new runs with their own verifiable evidence."
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
