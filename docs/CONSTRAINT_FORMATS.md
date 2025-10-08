# IK Constraint Formats

## Overview

p0qp0q-IK-Solver supports TWO constraint systems:

1. **Swing-Twist Constraints** (NEW, recommended) - Biomechanically accurate, no wraparound
2. **Euler Constraints** (LEGACY) - Original Three.js format, backward compatible

**The solver automatically chooses:**
- If `swingTwistConstraint` is present → Use swing-twist
- Otherwise → Fall back to Euler constraints (`rotationMin`, `rotationMax`, `limitation`)

---

## Swing-Twist Constraints (Recommended)

### Format

```javascript
{
  index: boneIndex,
  swingTwistConstraint: {
    type: 'hinge',                           // Joint classification
    twistAxis: new THREE.Vector3(0, 1, 0),   // Primary rotation axis (normalized)
    twistMin: 0,                             // Min rotation in radians
    twistMax: THREE.MathUtils.degToRad(130), // Max rotation in radians
    swingRadius: THREE.MathUtils.degToRad(5) // Wiggle cone in radians
  }
}
```

### Parameters

**`type`**: Joint classification (for documentation, not used by solver)
- `'hinge'` - Knee, elbow (1-axis)
- `'ball'` - Hip, shoulder (3-axis)
- `'universal'` - Ankle, wrist (2-axis)

**`twistAxis`**: Primary rotation axis in bone's **local space**
- Must be normalized Vector3
- Examples: `(0,1,0)` for Y-axis, `(1,0,0)` for X-axis
- **Pro tip:** Use BoneAxisDetector to auto-detect this!

**`twistMin/twistMax`**: Angular limits for primary axis rotation
- In radians (use `THREE.MathUtils.degToRad()`)
- **Hinge joints:** `twistMin=0, twistMax=2.27` (0-130°)
- **Ball joints:** `twistMin=-1.57, twistMax=1.57` (±90°)

**`swingRadius`**: Cone radius for secondary axis wiggle
- In radians
- Typical values: 0.05-0.09 radians (3-5°)
- Provides natural "joint play"

---

## Euler Constraints (Legacy)

### Format (Original Three.js)

```javascript
{
  index: boneIndex,
  limitation: new THREE.Vector3(1, 0, 0),  // Rotation axis
  rotationMin: new THREE.Vector3(0, 0, 0), // Min per axis (Euler)
  rotationMax: new THREE.Vector3(2.27, 0, 0) // Max per axis (Euler)
}
```

### Limitations

- ❌ ±180° wraparound issues
- ❌ Gimbal lock possible
- ❌ Hardcoded axis assumptions
- ❌ No wiggle room on secondary axes

**Kept for backward compatibility only!**

---

## Usage Examples

### Example 1: Hinge Joint (Knee)

```javascript
import * as THREE from 'three';
import { P0qP0qIKSolver } from 'p0qp0q-ik-solver';

const iks = [{
  target: footTargetIndex,
  effector: ankleIndex,
  links: [{
    index: kneeIndex,
    swingTwistConstraint: {
      type: 'hinge',
      twistAxis: new THREE.Vector3(0, 1, 0),  // Y-axis knee
      twistMin: 0,                             // No backward bending!
      twistMax: THREE.MathUtils.degToRad(130), // Medical max: 135-150°
      swingRadius: THREE.MathUtils.degToRad(5) // ±5° natural wiggle
    }
  }]
}];

const solver = new P0qP0qIKSolver(mesh, iks);
```

### Example 2: Ball Joint (Hip)

```javascript
{
  index: hipIndex,
  swingTwistConstraint: {
    type: 'ball',
    twistAxis: new THREE.Vector3(0, 1, 0),  // Primary rotation axis
    twistMin: THREE.MathUtils.degToRad(-45),  // Internal/external rotation
    twistMax: THREE.MathUtils.degToRad(45),
    swingRadius: THREE.MathUtils.degToRad(90) // Large cone for ball joint
  }
}
```

### Example 3: With BoneAxisDetector (Phase 3)

```javascript
import { BoneAxisDetector } from './BoneAxisDetector.js';

const axisDetector = new BoneAxisDetector();

// Auto-detect knee axis
const kneeAxisInfo = axisDetector.detectPrimaryAxis(kneeBone);
// Returns: { axis: 'y', confidence: 0.95, direction: Vector3(0, 1, 0) }

// Create constraint using detected axis
const iks = [{
  target: footTargetIndex,
  effector: ankleIndex,
  links: [{
    index: kneeIndex,
    swingTwistConstraint: {
      type: 'hinge',
      twistAxis: kneeAxisInfo.direction,  // Automatic! Works on ANY rig!
      twistMin: 0,
      twistMax: THREE.MathUtils.degToRad(130),
      swingRadius: THREE.MathUtils.degToRad(5)
    }
  }]
}];
```

### Example 4: Using ConstraintHelper

```javascript
import { ConstraintHelper } from 'p0qp0q-ik-solver/ConstraintHelper';

// Detect joint type from bone name
const jointType = ConstraintHelper.detectJointType('LeftLeg');
// Returns: 'knee'

// Create constraint from biomechanical data
const detectedAxis = new THREE.Vector3(0, 1, 0);  // From BoneAxisDetector
const constraint = ConstraintHelper.createFromBiomechanics(jointType, detectedAxis);

// Result:
// {
//   type: 'hinge',
//   twistAxis: Vector3(0, 1, 0),
//   twistMin: 0,
//   twistMax: 2.27 (130°),
//   swingRadius: 0.087 (5°)
// }
```

---

## Migration Guide

### From CCDIKSolver to P0qP0qIKSolver

**Old code:**
```javascript
import { CCDIKSolver } from 'three/addons/animation/CCDIKSolver.js';

const iks = [{
  links: [{
    index: kneeIndex,
    rotationMin: new THREE.Vector3(0, 0, 0),
    rotationMax: new THREE.Vector3(2.27, 0, 0)  // 130° on X-axis
  }]
}];

const solver = new CCDIKSolver(mesh, iks);
```

**New code:**
```javascript
import { P0qP0qIKSolver } from 'p0qp0q-ik-solver';

const iks = [{
  links: [{
    index: kneeIndex,
    swingTwistConstraint: {
      type: 'hinge',
      twistAxis: new THREE.Vector3(1, 0, 0),  // STILL X-axis
      twistMin: 0,
      twistMax: THREE.MathUtils.degToRad(130),
      swingRadius: THREE.MathUtils.degToRad(5)  // NEW: wiggle room!
    }
  }]
}];

const solver = new P0qP0qIKSolver(mesh, iks);
```

**Benefits:**
- ✅ No ±180° wraparound issues
- ✅ Natural wiggle room (more realistic)
- ✅ Same performance
- ✅ Drop-in replacement

---

## Biomechanical Presets

### Available Presets

```javascript
import { BiomechanicalConstraints } from 'p0qp0q-ik-solver/ConstraintHelper';

BiomechanicalConstraints.knee
// { type: 'hinge', flexion: 130, extension: 0, wiggle: 5, anatomicalMax: 150 }

BiomechanicalConstraints.elbow
// { type: 'hinge', flexion: 140, extension: 0, wiggle: 3, anatomicalMax: 150 }

BiomechanicalConstraints.hip
// { type: 'ball', flexion: 100, extension: 15, abduction: 40, ... }

BiomechanicalConstraints.shoulder
// { type: 'ball', flexion: 170, extension: 50, abduction: 160, ... }

BiomechanicalConstraints.ankle
// { type: 'universal', dorsiflexion: 20, plantarflexion: 45, ... }

BiomechanicalConstraints.wrist
// { type: 'universal', flexion: 80, extension: 70, ... }
```

### Using Presets

```javascript
import { ConstraintHelper, BiomechanicalConstraints } from 'p0qp0q-ik-solver/ConstraintHelper';

// Get medical-grade ROM data
const kneeData = BiomechanicalConstraints.knee;
// { flexion: 130, extension: 0, wiggle: 5 }

// Create constraint with auto-detected axis
const kneeAxis = detectorInstance.detectPrimaryAxis(kneeBone);

const kneeConstraint = ConstraintHelper.createHingeConstraint(
  kneeAxis.direction,
  kneeData.flexion,
  kneeData.extension,
  kneeData.wiggle
);

// Apply to IK chain
const iks = [{
  links: [{
    index: kneeIndex,
    swingTwistConstraint: kneeConstraint
  }]
}];
```

---

## Best Practices

### 1. Always Normalize Twist Axis

```javascript
// ❌ Wrong
twistAxis: new THREE.Vector3(0, 5, 0)  // Not normalized!

// ✅ Correct
twistAxis: new THREE.Vector3(0, 1, 0).normalize()
```

### 2. Use Radians, Not Degrees

```javascript
// ❌ Wrong
twistMax: 130  // Degrees won't work!

// ✅ Correct
twistMax: THREE.MathUtils.degToRad(130)  // 2.27 radians
```

### 3. Add Wiggle Room to Hinges

```javascript
// ❌ Too rigid (robotic animation)
swingRadius: 0  // Zero wiggle

// ✅ Natural (realistic joint play)
swingRadius: THREE.MathUtils.degToRad(5)  // ±5° wiggle
```

### 4. Don't Allow Backward Bending

```javascript
// ❌ Wrong (knees don't bend backward!)
twistMin: THREE.MathUtils.degToRad(-30)  // Hyperextension

// ✅ Correct (anatomically accurate)
twistMin: 0  // Straight leg is minimum
```

---

## Performance Notes

**Scale Detection:**
- Runs once per solver instance (cached)
- ~0.1ms overhead (negligible)

**Swing-Twist Decomposition:**
- ~0.05ms per constrained joint per iteration
- Typical: 4 joints × 10 iterations = 2ms total
- Well within 16ms frame budget (60fps)

**Memory:**
- Uses reusable quaternions (_swing, _twist)
- No allocations during solving (GC-friendly)

---

## Troubleshooting

### "Bone not bending"

**Check:**
1. Is `twistAxis` correct? (Should point along bone direction)
2. Are limits in radians? (Not degrees)
3. Is `twistMax` > 0? (Needs positive range)

### "Bone vibrating/jittering"

**Fix:**
1. Increase `swingRadius` (more wiggle room)
2. Reduce iteration count (faster convergence)
3. Check model scale (use scale detection)

### "Mesh tearing at joint"

**Likely:**
1. Wrong twist axis direction (flipped)
2. Limits too tight (no solution space)
3. Needs better weight painting

---

## Version History

**v0.1.0** (October 7, 2025)
- ✅ Scale-aware precision thresholds
- ✅ Swing-twist constraints INSIDE solver loop
- ✅ Backward compatible with Euler constraints
- ✅ ConstraintHelper utilities
- ✅ Biomechanical presets

**Upcoming (v0.2.0)**
- Multi-axis auto-detection integration
- Ball joint constraint improvements
- Octahedral bone visualization
- Comprehensive test suite

---

**See also:**
- [Biomechanical Joint Reference](../research/biomechanical-joint-reference.md)
- [Swing-Twist Research](../research/swing-twist-implementation-attempt.md)
- [Usage Examples](../examples/)
