# Phase 1 — Axis Detection Hardening

## Objective
Deliver a reliable axis-detection pipeline that matches solver expectations and exposes accurate diagnostics for all supported rig types.

## Step-by-Step Checklist
- [ ] **Kickoff Briefing** — Summarize current failure modes (porcupine octahedra, Mixamo shoulder drift) and confirm acceptance criteria.
- [ ] **Data Capture** — Export bind-pose snapshots (quaternion + child vectors) for:
  - [ ] Meshy humanoid
  - [ ] Meshy quadruped
  - [ ] Mixamo humanoid (FBX import)
  - [ ] TripoAI creature
- [ ] **Analysis Notebook** — Prototype blended axis extraction:
  - [ ] Compute principal axis from bind quaternion.
  - [ ] Compare with child direction and gizmo axis.
  - [ ] Determine weighting strategy and mirrored sign rule.
- [ ] **Implementation Pass** — Update `BoneAxisDetector`:
  - [ ] Introduce multi-child averaging with confidence scores.
  - [ ] Handle zero-length child offsets via gizmo axis fallback.
  - [ ] Normalize output vectors and store diagnostic metadata.
- [ ] **Unit Test Suite** — Add fixtures and assertions:
  - [ ] Positive Y knees (Meshy)
  - [ ] Negative Y knees (mirrored limbs)
  - [ ] Mixamo shoulder pre-rotation case
  - [ ] Quadruped hip with multiple children
- [ ] **Documentation Update** — Refresh relevant sections in `docs/` and Animator handbook.
- [ ] **Validation Session** — Use joint constraint gizmo + octahedral helper to verify alignment on all sample rigs.
- [ ] **Sign-off** — Record results in `NEXT_SESSION.md` and close associated GitHub issues.

## Deliverables
- Updated `BoneAxisDetector.js` with detailed comments.
- New fixtures under `tests/fixtures/` (or equivalent location).
- Test log demonstrating 100% pass rate.
- Notes in `NEXT_SESSION.md` summarizing findings and decision points.

