const EXAMPLE_SOURCE = "https://github.com/BlakeMasters/ocura-oss/blob/fe8f336b4be97c4ffb0ea818756d13da8189b72b/examples/dream_rsi";

export const DREAM_RSI_POST = {
  slug: "dream-rsi-with-ocura-oss",
  title: "A Dream-RSI workflow with Ocura OSS",
  category: "Engineering",
  description:
    "How Ocura's execution, lineage, and verified-log APIs supported a local workflow for agent-written training schedules, policy replay, and fresh deployment.",
  date: "2026-09-22",
  dateLabel: "September 22, 2026",
  readTime: "5 min read",
  art: "dream",
  sections: [
    {
      id: "from-paper-to-workflow",
      title: "The experiment",
      paragraphs: [
        "This study focuses on implementation support: how Ocura OSS helps developers build and inspect a Dream-RSI workflow. We use a small, bounded training experiment to exercise the integration, rather than to establish improvements in training performance.",
        "We adapted Dream-RSI to a local training workflow with Ocura OSS. One agent writes learning-rate schedules, another revises the policy that chooses which training attempt to pursue, and replay tests those policies against recorded results. The training workload ran locally on CPU, with agent access provided through Codex.",
        "Ocura records agent calls and training jobs through the same interface. Each attempt retains its command, output, and relationship to earlier work, giving the controller a consistent way to inspect results and decide what to run next.",
      ],
    },
    {
      id: "recorded-choices",
      title: "Replay",
      paragraphs: [
        "Dream-RSI's central idea is that discovery history can serve as a simulator. A search produces a tree of attempts: each candidate has a parent, an outcome, and evaluation feedback. Another exploration policy can traverse that recorded tree, receiving outcomes as it selects branches, without invoking the discovery agent or evaluator again.",
        "The paper alternates online discovery with offline policy development. A fixed agent proposes changes to executable exploration-policy code, replay evaluates those changes on accumulated histories, and the selected policy guides another online search. The new search then extends the available history.",
        "Our adaptation follows the paper's section 3. During replay, the policy sees only the part of the tree revealed by its choices. Selecting a branch returns its recorded continuation, if one exists. Testing a new candidate still requires a real training attempt.",
      ],
      links: [
        {
          label: "Read Dream-RSI: Recursive Self-Improvement through Evolving Worlds",
          href: "https://arxiv.org/pdf/2609.14858",
        },
      ],
    },
    {
      id: "recording-attempts",
      title: "Recording runs",
      paragraphs: [
        "Each attempt runs as a command. When it refines an earlier result, branch() connects it to that execution's terminal record, called a chokepoint. run() executes the command on the new pathway and captures its status, timing, and output.",
        "Store.read_verified_log() returns the saved output after checking its size and digest against the execution record. We read both stdout and stderr so the controller can inspect results alongside failure diagnostics. The helper below assumes an initialized experiment and an existing parent execution.",
      ],
      code: `from ocura_oss import Store, branch, run

def record_attempt(root, command, parent):
    child = branch(
        parent.chokepoint.id,
        root=root,
        reason="refine candidate",
    )
    execution = run(command, root=root, pathway_id=child.id)
    store = Store(root)
    stdout = store.read_verified_log(execution.atom.id)
    stderr = store.read_verified_log(execution.atom.id, stream="stderr")
    return execution, stdout, stderr`,
      links: [{ label: "Ocura OSS Python API", href: "/docs/api" }],
    },
    {
      id: "restoring-training",
      title: "Checkpoints",
      paragraphs: [
        "The evaluator uses pinned nanoGPT code and Tiny Shakespeare data. Each attempt trains for 16 updates. The discovery agent receives its parent's schedule and validation feedback, then returns a bounded Python learning_rate(step, total_steps) function. The model architecture, evaluator, and per-attempt training budget stay fixed.",
        "The training adapter restores the model, AdamW state, training step, and random-generator states from a checkpoint, checking its digest before loading. We tested this by comparing two resumed segments with continuous training across a schedule change. Model parameters, optimizer state, and both random-generator states matched exactly.",
      ],
    },
    {
      id: "debugging-evidence",
      title: "Debugging",
      paragraphs: [
        "Early policy requests timed out, and several runs stopped when the shared machine became busy. The saved commands and logs let us separate agent latency from evaluator time and inspect the work completed before each stop. We shortened the policy-development prompt and lowered reasoning effort; subsequent requests returned valid policy code.",
        "The report builder starts by verifying the stored records and reading their output. It then checks the experiment's configuration, checkpoint digests, and policy choices. That includes confirming that the policy selected in replay was the one used for the next training run.",
        "After the final run, we rebuilt the report from saved evidence and obtained the same result without calling an agent or loading PyTorch. We also checked the archived source and confirmed that each paired comparison began with identical checkpoint bytes.",
      ],
      code: `store = Store(root)
verification = store.verify_state()
if not verification.ok:
    raise ValueError(verification.problems)

logs = {
    atom.id: store.read_verified_log(atom.id)
    for atom in store.list_atoms()
}`,
      links: [{ label: "State and verification", href: "/docs/state" }],
    },
    {
      id: "completed-run",
      title: "Results",
      paragraphs: [
        "The final pilot finished in just under eight minutes: 17 agent calls, 15 training attempts, two policy revisions, and four held-out evaluations. Replay selected the first generated policy, which then guided fresh training. The second revision tied with it, so the controller kept the existing policy.",
        "The reconstructed report verified 80 execution records, 160 logs, and 20 checkpoints. Across all six development runs and diagnostics, we retained 54 agent calls and 43 completed training attempts, including the work from interrupted runs. The test suite ran 225 tests with five optional skips; the CPU checkpoint-continuation test passed separately.",
        "Under these bounded conditions, our Dream-RSI adaptation produced little evidence of useful policy improvement. Each search allowed three training attempts of 16 updates, with one policy revision between rounds. The selected policy spent all 48 updates continuing one branch. The fixed control trained a branch for 32 updates, then spent the remaining 16 on a restart. Although the selected policy achieved lower test loss on both fresh seeds, that result is consistent with simply training one branch longer.",
        "The policy also tied a simple greedy rule in replay: keep extending the best observed branch. Its initial replay-score improvement of 0.01 did not come from finding a better training result. It came from requesting a continuation absent from the saved tree, leaving one fewer recorded attempt to count against the score. In the live run, that same choice generated and trained a new candidate. The replay gain therefore gave us little reason to expect a more effective search strategy.",
        "These were short searches on a tiny model, with only two fresh comparison seeds. They may have offered too few meaningful choices for policy evolution to help. We also did not evaluate the greedy rule as a separate live control. The result describes the limits of this training adaptation; it leaves open how the method would perform in longer searches or on the paper's original tasks.",
      ],
      links: [{ label: "Pilot results and limitations", href: `${EXAMPLE_SOURCE}/RESEARCH_NOTES.md` }],
    },
    {
      id: "package-boundary",
      title: "Using Ocura OSS",
      paragraphs: [
        "The experiment implements agent access, checkpoint restoration, capacity limits, replay, and policy selection. Ocura supplies the execution records, parent relationships, and verified output used throughout those steps.",
        "That let us revise prompts and policy code while keeping a consistent record of every attempt. The same records supported debugging during development and reconstruction after the run. For a workflow that evolves with each experiment, being able to return to the commands and results makes the next change easier to investigate.",
      ],
      links: [
        { label: "Ocura OSS documentation", href: "/docs" },
        {
          label: "Example and reproduction guide",
          href: `${EXAMPLE_SOURCE}/README.md`,
        },
        {
          label: "Ocura OSS on PyPI",
          href: "https://pypi.org/project/ocura-oss/",
        },
      ],
    },
  ],
};
