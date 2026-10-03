---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

First, write `.claude/.implement-ran` with the current timestamp, so the Stop hook knows implement ran.

If the work is a GitHub issue, read it per `docs/agents/issue-tracker.md`, then check the branch isn't stale (worktrees often lag main):

```bash
git fetch origin main -q; echo "behind origin/main by $(git rev-list --count HEAD..origin/main)"
```

If behind, bring it up to date before starting.

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

Commit your work to the current branch.
