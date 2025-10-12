# Axis of Truth Sprint Directive

## Sprint Overview
- **Duration:** 2 weeks
- **Goal:** Align axis detection, solver math, and visualization so diagnostics match runtime behaviour while keeping Mixamo baselines stable.
- **Phase 1 Focus:** Axis Detection Hardening (active)

---

## Phase 1 — Axis Detection Hardening *(In Progress)*
- [ ] Audit current `BoneAxisDetector` behaviour on Meshy, Mixamo, TripoAI skeletons.
- [ ] Capture bind-pose quaternions & child transforms for multi-child joints (hips, shoulders, spine).
- [ ] Implement blended axis extraction (child direction + principal axis of bind quaternion).
- [ ] Add mirrored-limb sign resolution and zero-length fallbacks.
- [ ] Write fixture-based unit tests covering humanoid + quadruped rigs.
- [ ] Update docs with new detection strategy and usage notes.

---

## Task 2 — Visualization Truth Pass
- [ ] Feed joint constraint gizmo axis vectors into `OctahedralBoneHelper` for rendering.
- [ ] Add fallback for zero-length bones (reuse gizmo axis).
- [ ] Expose debug overlays/toggles for axis confidence in helper options.
- [ ] Validate visuals on Meshy humanoid, Mixamo humanoid, Meshy quadruped, TripoAI creature.
- [ ] Document workflow in `docs/` and examples.

---

## Task 3 — IK Target Infrastructure
- [ ] Decide on helper object vs appended bone approach for IK targets.
- [ ] Implement real target nodes and integrate with TransformControls.
- [ ] Update examples to use shared constraint gizmo while dragging.
- [ ] QA dragging workflow on all demo rigs.
- [ ] Document API changes and migration steps.

---

## Task 4 — Mixamo Bind-Pose Normalization
- [ ] Inventory Mixamo pre-rotation patterns (hips, shoulders, wrists).
- [ ] Add preprocessing pass in Animator to bake neutral pose.
- [ ] Regression-test Mixamo clips to confirm stability.
- [ ] Note out-of-scope live retargeting in issue tracker & documentation.
- [ ] Update deployment checklist for Animator integration.

---

## Task 5 — Solver Robustness & Tests
- [ ] Replace lowercase `math` references with `Math` and add zero-length guards.
- [ ] Build node-based regression harness to execute solver iterations headlessly.
- [ ] Create canned skeleton JSON fixtures (humanoid, quadruped, edge-case zero-length).
- [ ] Wire harness into `npm test` and CI.
- [ ] Summarize coverage & results in README/testing docs.

---

## Task 6 — Backlog & Issue Sync
- [ ] Review open GitHub issues in `p0qp0q-IK-Solver` and `p0qp0q-animation-utils`.
- [ ] Cross-link tasks and create new issues where gaps exist.
- [ ] Close resolved visualization bugs post-validation.
- [ ] Capture sprint notes & decisions in `NEXT_SESSION.md`.

---

## Daily Standup Template
- [ ] Progress since last check-in
- [ ] Plans for today
- [ ] Blockers / support needed

