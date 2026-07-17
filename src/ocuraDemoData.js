export const normalNodes = [
  {
    id: "main",
    label: "main()",
    kind: "entry",
    title: "Entry point",
    detail: "`main()` starts the script and calls the next function.",
    code: "def main():\n    hello_world()",
  },
  {
    id: "hello",
    label: "hello_world()",
    kind: "function",
    title: "Function call",
    detail: "`hello_world()` is the normal path called by `main()`.",
    code: "def hello_world():\n    print(\"hello_world\")",
  },
  {
    id: "printHello",
    label: "print()",
    kind: "output",
    title: "Normal output",
    detail: "The normal path writes `hello_world` to stdout.",
    code: "print(\"hello_world\")",
  },
];

export const chokepointNode = {
  id: "chokepoint",
  label: "chokepoint",
  kind: "record",
  title: "Chokepoint",
  detail:
    "A chokepoint marks a decision boundary before execution continues. It creates a place where the graph can preserve the normal path and split to a different function.",
  code: "ocura.chokepoint(\n    reason=\"before hello_world()\"\n)",
};

export const branchNodes = [
  {
    id: "review",
    label: "review_path()",
    kind: "branch",
    title: "Alternate function",
    detail:
      "`review_path()` opens a separate exploratory path at the chokepoint while the original `hello_world()` call remains visible.",
    code: "def review_path():\n    print(\"review branch\")",
  },
  {
    id: "printReview",
    label: "print()",
    kind: "branch-output",
    title: "Branch output",
    detail: "The split path writes its own output while the normal path remains visible.",
    code: "print(\"review branch\")",
  },
];

export const graphScripts = {
  baseline:
    "def hello_world():\n    print(\"hello_world\")\n\n\ndef main():\n    hello_world()\n\n\nmain()",
  chokepoint:
    "def hello_world():\n    print(\"hello_world\")\n\n\ndef main():\n    ocura.chokepoint(reason=\"before hello_world()\")\n    hello_world()\n\n\nmain()",
  split:
    "def hello_world():\n    print(\"hello_world\")\n\n\ndef review_path():\n    print(\"review branch\")\n\n\ndef main():\n    point = ocura.chokepoint(reason=\"before hello_world()\")\n    hello_world()\n    point.split(review_path)\n\n\nmain()",
};

export const graphOutputs = {
  idle: ["waiting to run"],
  normal: ["hello_world"],
  split: ["hello_world", "review branch"],
};

export const graphNote =
  "The panel demonstrates the V0 package grammar through a compact Python workflow.";
