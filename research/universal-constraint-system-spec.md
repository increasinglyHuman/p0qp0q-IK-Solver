# Universal Constraint System - Technical Specification

**Version:** 2.0 (Axis-Agnostic)
**Date:** October 7, 2025
**Status:** Architecture Design
**Author:** Allen Partridge + Claude

---

## Executive Summary

The current constraint system assumes all rigs use the same axis conventions (X-axis for knee flexion, etc.). This fails when importing models from different sources (Mixamo, Character Creator, TripoAI, etc.) because each platform uses different local bone coordinate systems.

**Goal:** Create a universal constraint system that:
1. Auto-detects each bone's local axis orientation
2. Applies anatomically accurate constraints to the CORRECT axis
3. Allows natural "wiggle room" on secondary axes
4. Works across ALL rig types without manual configuration

---

## Current Problems

### Problem 1: Hardcoded Axis Assumptions

**Current Code (index.html ~line 11160):**
```javascript
{
  index: this.bones.indexOf(leftLowerLeg), // Knee
  limitation: new THREE.Vector3(1, 0, 0),  // ❌ ASSUMES X-axis!
  rotationMin: new THREE.Vector3(0, 0, 0), // ❌ Y/Z completely locked
  rotationMax: new THREE.Vector3(130, 0, 0)
}
```

**Problem:**
- Meshy models: Knee rotates on X-axis ✅
- Some rigs: Knee rotates on Y-axis ❌
- Other rigs: Knee rotates on Z-axis ❌

**Result:** Constraints applied to wrong axis → mesh deformation, impossible poses

---

### Problem 2: Zero Secondary Axis Movement

**Current:**
```javascript
rotationMin: { x: 0, y: 0, z: 0 }  // Secondary axes LOCKED
```

**Anatomical Reality:**
- Primary axis: Full ROM (e.g., knee flexion 0-130°)
- Secondary axes: NOT zero! ~±3-5° natural joint play
- Allows for:
  - Slight internal/external rotation when flexed
  - Natural wobble during movement
  - Realistic weight shifting

**Without wiggle:** Animations look robotic, IK solving is too constrained.

---

### Problem 3: No Axis Auto-Detection

**Current:** Developer must manually know which axis each bone uses.

**Need:** System that auto-detects:
1. Which direction is "forward" for this bone?
2. Which axis controls primary movement (flexion/extension)?
3. What's the bone's local coordinate frame?

---

## Proposed Solution: 3-Phase System

### Phase 1: Bone Axis Detection (Foundation)

**Goal:** Auto-detect each bone's local coordinate system.

**Method:**

```javascript
class BoneAxisDetector {
  /**
   * Detect which local axis corresponds to flexion/extension
   * @param {THREE.Bone} bone - The bone to analyze
   * @param {THREE.Skeleton} skeleton - Full skeleton for context
   * @returns {Object} { primaryAxis: 'x'|'y'|'z', localFrame: Matrix3 }
   */
  detectFlexionAxis(bone, skeleton) {
    // 1. Get bone direction (parent → child vector)
    const boneDirection = this.getBoneDirection(bone);

    // 2. Test small rotations on each axis
    const testResults = this.testAxisRotations(bone, skeleton);

    // 3. Primary axis = one that moves child bone most
    const primaryAxis = testResults.maxMovementAxis;

    // 4. Build local coordinate frame
    const localFrame = this.buildLocalFrame(bone, boneDirection, primaryAxis);

    return {
      primaryAxis,
      localFrame,
      confidence: testResults.confidence
    };
  }

  getBoneDirection(bone) {
    if (bone.children.length === 0) {
      // End effector - use parent's direction
      return this.getBoneDirection(bone.parent).negate();
    }

    // Find first child bone (skip non-bone children)
    const childBone = bone.children.find(c => c.isBone);
    if (!childBone) {
      return new THREE.Vector3(0, 1, 0); // Default up
    }

    // Direction = child position in bone's local space
    return childBone.position.clone().normalize();
  }

  testAxisRotations(bone, skeleton) {
    const originalRotation = bone.rotation.clone();
    const testAngle = THREE.MathUtils.degToRad(5); // Small test rotation

    const results = {
      x: this.testRotationAxis(bone, 'x', testAngle, skeleton),
      y: this.testRotationAxis(bone, 'y', testAngle, skeleton),
      z: this.testRotationAxis(bone, 'z', testAngle, skeleton)
    };

    // Restore original rotation
    bone.rotation.copy(originalRotation);
    bone.updateMatrixWorld(true);

    // Find axis with maximum movement
    const maxMovement = Math.max(results.x, results.y, results.z);
    const maxAxis = Object.keys(results).find(axis => results[axis] === maxMovement);

    return {
      maxMovementAxis: maxAxis,
      movements: results,
      confidence: maxMovement / (results.x + results.y + results.z) // 0-1
    };
  }

  testRotationAxis(bone, axis, angle, skeleton) {
    // Get child bone position before rotation
    const childBone = bone.children.find(c => c.isBone);
    if (!childBone) return 0;

    const beforePos = new THREE.Vector3();
    childBone.getWorldPosition(beforePos);

    // Apply test rotation
    bone.rotation[axis] += angle;
    bone.updateMatrixWorld(true);

    // Get child bone position after rotation
    const afterPos = new THREE.Vector3();
    childBone.getWorldPosition(afterPos);

    // Measure movement distance
    const movement = beforePos.distanceTo(afterPos);

    // Restore rotation
    bone.rotation[axis] -= angle;
    bone.updateMatrixWorld(true);

    return movement;
  }
}
```

---

### Phase 2: Anatomically Accurate Constraints with Wiggle

**New Constraint Format:**

```javascript
{
  "boneName": "LowerLeg_L",
  "jointType": "hinge",

  // Axis-agnostic constraints
  "primaryAxis": {
    "detectedAxis": "x",        // Auto-detected OR user-specified
    "flexion": 130,             // Forward bend (degrees)
    "extension": 0,             // Backward bend (degrees, usually 0 for hinges)
    "isSymmetric": false        // Flexion ≠ extension
  },

  "secondaryAxes": {
    "wiggleAmount": 3,          // ±3° on non-primary axes
    "allowCoupled": true,       // Allow slight rotation when flexed
    "coupledFactor": 0.5        // 50% of flexion angle allows coupled rotation
  },

  // Medical reference data
  "anatomicalMaximum": 150,     // Medical ROM maximum
  "safeWorkingRange": 130,      // Recommended for animation
  "functionalRange": 90,        // Common daily movement

  // Per-axis absolute limits (fallback if axis detection fails)
  "absoluteLimits": {
    "x": { "min": -5, "max": 135 },
    "y": { "min": -3, "max": 3 },
    "z": { "min": -3, "max": 3 }
  }
}
```

---

### Phase 3: Constraint Application Pipeline

**New workflow:**

```javascript
class UniversalConstraintSystem {
  applyConstraints(bone, jointType, anatomicalData) {
    // 1. Detect bone's local axis orientation
    const axisInfo = this.axisDetector.detectFlexionAxis(bone, this.skeleton);

    // 2. Get anatomical constraints for joint type
    const constraints = this.getAnatomicalConstraints(jointType);

    // 3. Map anatomical constraints to detected axes
    const mappedConstraints = this.mapConstraintsToLocalAxes(
      constraints,
      axisInfo
    );

    // 4. Apply to IK solver
    this.applyToSolver(bone, mappedConstraints);

    // 5. Update constraint widget to show correct axes
    this.updateConstraintWidget(bone, mappedConstraints, axisInfo);
  }

  mapConstraintsToLocalAxes(anatomicalConstraints, axisInfo) {
    const result = { x: {}, y: {}, z: {} };

    // Map primary axis (flexion/extension)
    const primaryAxis = axisInfo.primaryAxis; // 'x', 'y', or 'z'
    result[primaryAxis] = {
      min: -anatomicalConstraints.extension,
      max: anatomicalConstraints.flexion
    };

    // Add wiggle to secondary axes
    const secondaryAxes = ['x', 'y', 'z'].filter(a => a !== primaryAxis);
    secondaryAxes.forEach(axis => {
      result[axis] = {
        min: -anatomicalConstraints.secondaryWiggle,
        max: anatomicalConstraints.secondaryWiggle
      };
    });

    return result;
  }
}
```

---

## Anatomical Constraint Data (Revised)

### Hinge Joints (Knee, Elbow)

**Anatomical Characteristics:**
- **Primary ROM:** 0-130° (flexion only, no hyperextension)
- **Secondary wiggle:** ±3-5° (natural joint play)
- **Coupled rotation:** When flexed >60°, allows ±10° internal/external rotation

**New Constraint Definition:**

```javascript
const KNEE_CONSTRAINTS = {
  jointType: 'hinge',

  primary: {
    flexion: 130,        // Medical max: 135-150°, safe: 130°
    extension: 0,        // No backward bending!
    axis: 'auto-detect'  // Don't assume X/Y/Z
  },

  secondary: {
    wiggle: 5,           // ±5° on non-primary axes
    allowWhenFlexed: true,
    flexedThreshold: 60, // Above 60° flexion
    flexedWiggle: 10     // Allows ±10° rotation when knee bent
  },

  warnings: [
    "Knees don't bend backward (no hyperextension)",
    "Secondary axes should have minimal movement (±5° max)",
    "Internal/external rotation only when knee is bent"
  ]
};

const ELBOW_CONSTRAINTS = {
  jointType: 'hinge',

  primary: {
    flexion: 140,        // Medical max: 145-150°, safe: 140°
    extension: 0,        // No backward bending!
    axis: 'auto-detect'
  },

  secondary: {
    wiggle: 3,           // ±3° on non-primary axes (less than knee)
    allowWhenFlexed: true,
    flexedThreshold: 90,
    flexedWiggle: 5      // Minimal rotation even when bent
  },

  warnings: [
    "Elbows don't bend backward",
    "Forearm rotation (pronation/supination) is NOT at elbow - it's radioulnar joints!",
    "Very limited secondary axis movement"
  ]
};
```

---

### Ball Joints (Hip, Shoulder)

**Anatomical Characteristics:**
- **All axes active:** Different ROM per axis
- **Asymmetric:** Flexion >> Extension
- **Position-dependent:** ROM changes based on joint angle
- **Coupled motion:** Moving one axis affects others

**New Constraint Definition:**

```javascript
const HIP_CONSTRAINTS = {
  jointType: 'ball',

  // All axes have full ROM, but different ranges
  axes: {
    flexion: {        // Forward/backward (sagittal plane)
      positive: 100,  // Flexion (knee to chest)
      negative: 15,   // Extension (leg behind body)
      axis: 'auto-detect'
    },
    abduction: {      // Side-to-side (frontal plane)
      positive: 40,   // Away from midline
      negative: 25,   // Across midline (adduction)
      axis: 'auto-detect'
    },
    rotation: {       // Internal/external (transverse plane)
      positive: 45,   // External rotation
      negative: 35,   // Internal rotation
      axis: 'auto-detect'
    }
  },

  // Coupled motion rules
  coupling: {
    // When hip is flexed >90°, abduction range increases
    flexedAbduction: {
      threshold: 90,
      bonusROM: 20   // Extra 20° abduction when flexed
    }
  },

  warnings: [
    "Hip extension is very limited (10-30°) compared to flexion (100°+)",
    "External rotation > internal rotation (asymmetric)",
    "ROM increases when hip is flexed (coupled motion)"
  ]
};
```

---

## Implementation Roadmap

### **Stage 1: Data Model Update** (1-2 hours)

1. Update `biomechanical-joint-reference.md` with revised constraint format
2. Add wiggle room to all hinge joints (±3-5°)
3. Document axis-agnostic constraint philosophy
4. Add coupled motion data

**Deliverable:** Updated reference document with new format

---

### **Stage 2: Axis Detection System** (3-4 hours)

1. Create `BoneAxisDetector` class
2. Implement `detectFlexionAxis()` method
3. Test on Meshy, TripoAI, Character Creator, Mixamo models
4. Validate detection accuracy (>95% correct)
5. Add manual override option

**Deliverable:** Working axis detector that returns primary axis per bone

---

### **Stage 3: Constraint Mapper** (2-3 hours)

1. Create `ConstraintMapper` class
2. Map anatomical constraints → local bone axes
3. Handle primary + secondary axes
4. Apply wiggle room intelligently
5. Update CCDIKSolver integration

**Deliverable:** Universal constraint application system

---

### **Stage 4: Widget System Update** (1-2 hours)

1. Update `JointConstraintWidget` to use detected axes
2. Show primary axis prominently (thicker arc)
3. Show secondary wiggle (dashed lines)
4. Color-code: Green = primary, Yellow = secondary
5. Display detected axis in UI

**Deliverable:** Widgets automatically orient to correct bone axes

---

### **Stage 5: Educational Companion App** (4-6 hours)

Create standalone HTML educational tool: `education/joint-constraint-explorer.html`

**Features:**
- Load joint presets (knee, elbow, hip, etc.)
- Interactive 3D joint visualization
- Slider controls for ROM testing
- Anatomical diagrams
- Real-time constraint validation
- Export tested constraints as JSON
- "Try to move your real knee sideways" → feel the limits

**Purpose:**
- Validate our constraint data through teaching
- User testing reveals edge cases
- Marketing/educational content
- Community contribution tool

**Deliverable:** Working educational app that validates and teaches constraints

---

## Technical Deep Dive: Axis Detection Algorithm

### The Challenge

Given a bone with unknown local axis orientation, determine which axis controls primary joint movement.

**Example:**
```
Meshy Knee:     Rotates on X-axis (1, 0, 0)
CC Rig Knee:    Rotates on Y-axis (0, 1, 0)
Custom Rig:     Rotates on Z-axis (0, 0, 1)
```

### Detection Strategy

**Method 1: Bone Direction Vector (Fast, Simple)**

```javascript
function detectAxisFromBoneDirection(bone) {
  const childBone = bone.children.find(c => c.isBone);
  if (!childBone) return 'x'; // Default fallback

  // Child position in local space = bone direction
  const dir = childBone.position.clone().normalize();

  // Find dominant axis
  const absX = Math.abs(dir.x);
  const absY = Math.abs(dir.y);
  const absZ = Math.abs(dir.z);

  if (absX > absY && absX > absZ) return 'x';
  if (absY > absX && absY > absZ) return 'y';
  return 'z';
}
```

**Pros:** Fast, no skeleton manipulation
**Cons:** Assumes bone direction = flexion axis (not always true!)

---

**Method 2: Rotation Testing (Accurate, Slower)**

```javascript
function detectAxisByTesting(bone, skeleton) {
  // Save current state
  const originalRot = bone.rotation.clone();
  const originalQuat = bone.quaternion.clone();

  const testAngle = THREE.MathUtils.degToRad(10); // 10° test
  const movements = {};

  // Test each axis
  ['x', 'y', 'z'].forEach(axis => {
    // Apply rotation on this axis
    bone.rotation[axis] = testAngle;
    bone.updateMatrixWorld(true);

    // Measure how much end effector moved
    const endEffector = this.getEndEffector(bone);
    const movement = this.measureMovement(endEffector);

    movements[axis] = movement;

    // Restore
    bone.rotation.copy(originalRot);
    bone.quaternion.copy(originalQuat);
    bone.updateMatrixWorld(true);
  });

  // Primary axis = one with maximum movement
  return Object.keys(movements).reduce((a, b) =>
    movements[a] > movements[b] ? a : b
  );
}
```

**Pros:** Very accurate, works for any rig
**Cons:** Requires skeleton manipulation, slower

---

**Method 3: Hybrid Approach (Best)**

```javascript
function detectAxisHybrid(bone, skeleton) {
  // Quick check: Bone direction
  const directionAxis = this.detectAxisFromBoneDirection(bone);

  // Validation: Test rotations
  const testedAxis = this.detectAxisByTesting(bone, skeleton);

  // If they agree, high confidence
  if (directionAxis === testedAxis) {
    return { axis: directionAxis, confidence: 0.95 };
  }

  // If they disagree, trust testing but flag for review
  console.warn(`Axis detection mismatch for ${bone.name}: direction=${directionAxis}, tested=${testedAxis}`);
  return { axis: testedAxis, confidence: 0.7 };
}
```

---

## Wiggle Room Implementation

### The Concept

**Zero-tolerance locking is unrealistic:**

```javascript
// ❌ Current (too rigid)
rotationMin: { x: 0, y: 0, z: 0 }
rotationMax: { x: 130, y: 0, z: 0 }

// ✅ Proposed (natural)
rotationMin: { x: 0, y: -3, z: -3 }    // ±3° wiggle
rotationMax: { x: 130, y: 3, z: 3 }
```

### Wiggle Amount Guidelines

**Based on joint type:**

| Joint Type | Primary Axis | Secondary Wiggle | Reasoning |
|------------|-------------|------------------|-----------|
| Hinge (Knee) | Full ROM | ±5° | Allows slight internal/external rotation |
| Hinge (Elbow) | Full ROM | ±3° | More constrained than knee |
| Ball (Hip) | Full ROM | N/A | All axes active |
| Ball (Shoulder) | Full ROM | N/A | All axes active |
| Universal (Ankle) | 2 axes full | ±5° on third | Minimal third axis |
| Universal (Wrist) | 2 axes full | ±3° on third | Very limited third axis |
| Spine Segment | Limited all | Per segment | Distributed motion |

### Coupled Motion (Advanced)

**Example: Knee allows more rotation when flexed**

```javascript
function getKneeConstraints(currentFlexionAngle) {
  const baseConstraints = {
    x: { min: 0, max: 130 },      // Flexion axis
    y: { min: -3, max: 3 },       // Base wiggle
    z: { min: -3, max: 3 }        // Base wiggle
  };

  // If knee is flexed >60°, allow more Y-axis rotation
  if (currentFlexionAngle > 60) {
    const flexedBonus = (currentFlexionAngle - 60) * 0.15; // 0.15° per degree flexed
    baseConstraints.y.min = -3 - flexedBonus;
    baseConstraints.y.max = 3 + flexedBonus;
  }

  return baseConstraints;
}
```

**This models reality:**
- Straight knee: Very limited rotation
- Bent knee: Can twist more (think sitting with legs crossed)

---

## Educational App Prototype

### Concept: Joint Constraint Explorer

**File:** `/education/joint-constraint-explorer.html`

**Purpose:**
- Teach users about joint mechanics
- Validate our constraint data
- Let users feel the difference between good/bad constraints
- Export validated constraints for use in main app

### UI Mockup

```
┌─────────────────────────────────────────────────────────┐
│  Joint Constraint Explorer                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌─────────────────────────────────┐ │
│  │              │  │  KNEE JOINT (Hinge)             │ │
│  │              │  │                                 │ │
│  │   [3D Knee]  │  │  Primary Axis: X (Flexion)      │ │
│  │   Rotating   │  │  Current Angle: 45°             │ │
│  │              │  │                                 │ │
│  │     ┌─●      │  │  Flexion:    [■■■■■□] 130°     │ │
│  │     │        │  │  Extension:  [Locked] 0°        │ │
│  │     │        │  │                                 │ │
│  │   Thigh      │  │  Secondary Wiggle:              │ │
│  │              │  │  Y-axis: [■□□□□] ±3°           │ │
│  │              │  │  Z-axis: [■□□□□] ±3°           │ │
│  └──────────────┘  │                                 │ │
│                    │  Anatomical Max: 150°           │ │
│  Joint Type:       │  Your Setting: 130° ✅          │ │
│  [Knee  ▼]         │                                 │ │
│                    │  ⚠️ Warnings: None              │ │
│  Model:            │  💡 Tip: Knees only bend        │ │
│  [Adult Male ▼]    │     forward, never backward!    │ │
│                    │                                 │ │
│                    │  [Apply] [Reset] [Export JSON]  │ │
│                    └─────────────────────────────────┘ │
│                                                         │
│  Try It: Drag the joint to feel the constraints!       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Interactive Features

1. **Drag to rotate** - Feel the constraints in real-time
2. **Slider control** - Adjust ROM limits
3. **Validation** - Shows warnings if anatomically impossible
4. **Comparison mode** - Toggle between different constraint sets
5. **Export** - Save validated constraints as JSON
6. **Import** - Load and test community constraints

### Educational Content

**For each joint:**
- Anatomical diagram (2D cross-section)
- 3D interactive model
- Real-world examples ("Walking uses 0-60° knee flexion")
- Common mistakes ("Don't allow backward knee bending!")
- Medical references (with citations)

---

## Migration Path (Existing Code → New System)

### Current State

**Hardcoded in detectIKChains():**
```javascript
{
  index: this.bones.indexOf(leftLowerLeg),
  limitation: new THREE.Vector3(1, 0, 0),  // ❌ Hardcoded X-axis
  rotationMin: new THREE.Vector3(0, 0, 0),
  rotationMax: new THREE.Vector3(130, 0, 0)
}
```

### Transition State (Backward Compatible)

```javascript
{
  index: this.bones.indexOf(leftLowerLeg),
  limitation: this.detectPrimaryAxisVector(leftLowerLeg),  // Auto-detect
  rotationMin: this.getConstraintMin(leftLowerLeg, 'knee'),
  rotationMax: this.getConstraintMax(leftLowerLeg, 'knee')
}
```

### Future State (Full System)

```javascript
// Constraints defined separately from IK chains
const constraints = this.constraintSystem.getConstraints(leftLowerLeg);
this.ikSolver.applyConstraints(leftLowerLeg, constraints);
```

---

## Testing Strategy

### Validation Models

Test constraint system with diverse rigs:

1. **Meshy3D GLB** - Baseline (current working standard)
2. **TripoAI GLB** - Different axis orientation
3. **Character Creator FBX** - Lowercase naming, twist bones
4. **Mixamo FBX** - Namespace prefix, finger bones
5. **Blender Rigify** - DEF- prefix, .L/.R suffix
6. **UE5 Mannequin** - Lowercase underscore, numbered spine
7. **Custom rig** - User-created, unknown conventions

### Test Cases Per Model

- [ ] Axis detection accuracy (>95% correct)
- [ ] Primary axis ROM correct
- [ ] Secondary wiggle allows natural movement
- [ ] No mesh deformation at constraint limits
- [ ] IK solving smooth and stable
- [ ] Constraints export/import correctly
- [ ] Widget orientation correct

---

## API Design

### Usage Example

```javascript
// Initialize universal constraint system
const constraintSystem = new UniversalConstraintSystem({
  axisDetectionMethod: 'hybrid',  // 'direction' | 'testing' | 'hybrid'
  enableWiggle: true,
  wiggleAmount: 5,                // Default ±5° on secondary axes
  enableCoupledMotion: true
});

// Load model
const model = loadGLB('character.glb');

// Auto-detect and apply constraints
model.skeleton.bones.forEach(bone => {
  const jointType = constraintSystem.detectJointType(bone);

  if (jointType) {
    const constraints = constraintSystem.generateConstraints(
      bone,
      jointType,
      'realistic'  // 'conservative' | 'realistic' | 'athletic'
    );

    constraintSystem.applyToBone(bone, constraints);
  }
});

// Later: Export for sharing
const exportedConstraints = constraintSystem.exportConstraints(model);
saveJSON(exportedConstraints, 'my-rig-constraints.json');
```

---

## Risk Assessment

### Technical Risks

**High Risk:**
- Axis detection false positives (wrong axis detected)
- Performance impact (testing all bones on load)
- CCDIKSolver compatibility with dynamic constraints

**Mitigation:**
- Extensive testing across rig types
- Cache detection results
- Manual override option
- Validation warnings

**Medium Risk:**
- Wiggle room causing unstable IK solving
- Coupled motion complexity
- UI confusion (too many options)

**Mitigation:**
- Conservative wiggle amounts (start with ±3°)
- Phase in coupled motion gradually
- Progressive disclosure in UI

**Low Risk:**
- Breaking existing models (Meshy)
- Performance degradation
- Export compatibility

**Mitigation:**
- Backward compatibility mode
- Feature flags for new system
- Profiling and optimization

---

## Success Metrics

**Technical:**
- ✅ 95%+ axis detection accuracy across 7 rig types
- ✅ No mesh deformation at constraint limits
- ✅ IK solving stable with wiggle room
- ✅ <5% performance overhead

**User Experience:**
- ✅ Biomechanical constraints work on first try (any rig)
- ✅ No manual axis configuration needed
- ✅ Natural-looking poses achievable
- ✅ Educational app teaches joint mechanics effectively

**Business:**
- ✅ Support for all major platforms (Mixamo, Blender, UE5, etc.)
- ✅ Educational content drives user adoption
- ✅ Community constraint sharing enabled
- ✅ Competitive differentiation (only tool with universal constraints)

---

## Timeline Estimate

**Full Implementation:**

| Phase | Description | Estimated Time |
|-------|-------------|---------------|
| 1 | Data model update | 1-2 hours |
| 2 | Axis detection | 3-4 hours |
| 3 | Constraint mapper | 2-3 hours |
| 4 | Widget updates | 1-2 hours |
| 5 | Educational app | 4-6 hours |
| Testing | Across 7 rig types | 2-3 hours |
| **Total** | | **13-20 hours** |

**Phased Approach:**
- **Tonight:** Phases 1-2 (Data + Axis Detection) = 4-6 hours
- **Next Session:** Phases 3-4 (Mapper + Widgets) = 3-5 hours
- **Future:** Phase 5 (Educational App) = 4-6 hours

---

## Decision Point

**What Allen needs to decide:**

1. **Scope:** Full system (13-20 hrs) or just axis detection (4-6 hrs)?
2. **Timing:** Start tonight or next session?
3. **Approach:** Code-first or educational-app-first?
4. **Scale:** 10x or 100x for FBX models?

**Recommendation:**
- Tonight: Fix immediate issues (10x scaling, basic wiggle room)
- Next session: Full axis detection system
- Future: Educational app (validates everything)

---

**Document complete. Ready for implementation decision.**
