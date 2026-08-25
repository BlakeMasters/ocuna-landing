# Ocura OSS

Version 0.2.2.

Ocura OSS packages an adapted early Ocura research concept as a small local command-line tool. The package also provides a typed Python interface to the same workflow.

Ocura OSS records trusted local command executions as project-local state. It can create metadata branches, attach later runs to those branches, compare recorded evidence, and verify the consistency of its records and logs.

Current [Ocura](/ocura) engine development is separate from this package. Ocura OSS is research software, not the current engine or a production release.

## Installation

Ocura OSS requires Python 3.11 or later. Its runtime uses only the Python standard library.

```console
python -m pip install ocura-oss
```

The package installs the `ocura-oss` command and the `ocura_oss` import package.

```console
ocura-oss --help
```

```python
import ocura_oss

print(ocura_oss.__version__)
```

## Documentation

| Reference | Contents |
| --- | --- |
| [CLI reference](/docs/cli) | Commands, options, output formats, state effects, and exit status |
| [Python API reference](/docs/api) | Workflow functions, `Store`, data models, enums, exceptions, and typing |

The [source repository](https://github.com/BlakeMasters/ocura-oss) contains the tests, changelog, security policy, and contributor guide. Release files are available from [PyPI](https://pypi.org/project/ocura-oss/).

## Recorded workflow

The package records this sequence:

`run -> evidence -> chokepoint -> branch -> rerun -> compare`

A command attempt produces one atom, two referenced output logs, and one terminal chokepoint. The atom belongs to a pathway.

A branch creates a child pathway with a source chokepoint, a reason, and declared parameter overrides. It records lineage metadata only. A later run must name the child pathway to attach new evidence to it.

## Quick start

Run the complete retained demonstration:

```console
ocura-oss demo --root ./ocura-oss-demo
```

The destination must not exist. The demonstration initializes state, records a baseline command, creates a branch, records a child run, verifies the state, and reports a comparison.

For direct use:

```console
ocura-oss init --name example
ocura-oss run --param batch=1 -- python script.py
ocura-oss chokepoints
ocura-oss branch --from <chokepoint-id> --reason "increase batch" --param batch=4
ocura-oss run --pathway <child-pathway-id> --param batch=4 -- python script.py
ocura-oss verify
ocura-oss compare --from <chokepoint-id>
```

The same workflow is available from Python:

```python
import sys
from pathlib import Path

from ocura_oss import ComparisonState, branch, compare, initialize, run, verify

root = Path("experiment")
initialize(root, name="batch study")

baseline = run(
    [sys.executable, "-c", "print('baseline')"],
    root=root,
    parameters={"batch": "1"},
)

child = branch(
    baseline.chokepoint.id,
    root=root,
    reason="increase batch",
    parameters={"batch": "4"},
)

run(
    [sys.executable, "-c", "print('child')"],
    root=root,
    pathway_id=child.id,
    parameters={"batch": "4"},
)

result = compare(baseline.chokepoint.id, root=root)
assert result.state is ComparisonState.READY
assert verify(root).ok
```

## Concepts

| Term | Definition |
| --- | --- |
| Den | The identity for one project-local state directory and its default pathway |
| Pathway | One lineage of declared parameters and recorded evidence |
| Atom | One recorded command attempt and its referenced stdout and stderr logs |
| Chokepoint | A terminal evidence boundary that can serve as a metadata branch source |

Declared parameters are labels stored with pathways and atoms. Ocura OSS does not interpret them or pass them to the command automatically.

## Local state

State is stored under `.ocura-oss/` in the selected project root:

```text
.ocura-oss/
  den.json
  pathways/
    <pathway-id>.json
  atoms/
    <atom-id>.json
  chokepoints/
    <chokepoint-id>.json
  logs/
    <atom-id>.stdout.log
    <atom-id>.stderr.log
```

Each JSON record contains a schema version, a record kind, a payload, and a SHA-256 checksum over the canonical record content. The checksums provide local change detection. They are not authenticated signatures and do not establish authorship.

One mutating process per state root is supported at a time. Legacy `.ocura/` state is not compatible with `.ocura-oss/` records.

Removing `.ocura-oss/` removes all Ocura OSS state for that project.

## Verification

`ocura-oss verify` and `ocura_oss.verify()` recheck state records and every log referenced by a recorded run.

Verification covers:

- envelope shape, record kind, and schema version
- record checksums, identifiers, filenames, and required fields
- den, pathway, atom, and chokepoint relationships
- pathway lineage and source-parent agreement
- referenced log containment, existence, byte count, and SHA-256 digest
- unreferenced files and unexpected directories under `.ocura-oss/logs/`

Verification establishes consistency among local records and logs. It does not establish authorship, capture the execution environment, or reproduce external conditions.

A source-evidence verification failure prevents branching and comparison.

## Recorded information

Atoms retain command arguments, declared parameters, outcome, return code, timing, log paths, byte counts, and log digests. Logs retain command output. Pathways retain lineage, branch reasons, source chokepoints, and effective parameters.

The child command inherits the invoking process environment, but Ocura OSS does not serialize environment keys or values.

Ocura OSS does not record dependency versions, source revisions, workspace contents, process memory, network activity, or external-system state.

Keep secrets out of command arguments, declared parameters, branch reasons, and command output.

## Execution boundary

Commands run directly on the local machine with `shell=False` and the selected project root as their working directory.

Ocura OSS does not provide:

- command sandboxing
- network restriction
- hostile-code containment
- process-tree isolation
- workspace, process, checkpoint, or artifact snapshots
- replay or restoration of external state

Use Ocura OSS only for trusted, same-owner local workloads.

## Version and support

Version 0.2.2 is published on PyPI and supports CPython 3.11 through 3.14.

The API and record format remain provisional during the 0.x series. Ocura OSS does not include a production support commitment.

The source code and tests are licensed under the [Mozilla Public License 2.0](https://github.com/BlakeMasters/ocura-oss/blob/main/LICENSE).

Bug reports and focused pull requests are welcome. Read the [contributor guide](https://github.com/BlakeMasters/ocura-oss/blob/main/CONTRIBUTING.md) before submitting changes.

Report security issues through the [security policy](https://github.com/BlakeMasters/ocura-oss/blob/main/SECURITY.md). Documentation and research questions can go to [business@ocuna-ai.com](mailto:business@ocuna-ai.com) or the [contact page](/contact).
