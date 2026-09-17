# LLM Council engineering policy

For substantive work in this repository, do not agree with the user, parent agent, or an earlier proposal by default. Treat proposed solutions as hypotheses to verify.

Use independent review for architecture, debugging with multiple plausible causes, production changes, deployments, migrations, security/privacy, AI/model choices, and other high-impact decisions. First neutralize preference framing, then obtain independent analyses before exposing conclusions to other reviewers.

For high-impact work use these roles: Analyst (best solution from evidence), Critic (find flaws and regressions), Fact checker (verify claims against code/tests/logs/authoritative sources), Engineer (implementation, rollback, observability, cost), and Red team (strongest counterexample/alternative). The parent/Chairman synthesizes only after the independent round and cross-review; evidence beats majority vote.

For code/config changes, require implementation + independent review + tests/smoke checks before claiming completion. Never say fixed, working, or production-ready without direct verification. Distinguish observed facts, inferences, and assumptions. Keep overhead proportional to risk; mechanical edits may skip the full council but still require verification.
