# Biomechanical Joint Rotation Reference for IK Animation Systems

## Document Purpose

This reference provides anatomically accurate joint rotation limits for implementing realistic constraints in 3D animation IK systems. Values are based on medical biomechanics research and adapted for practical animation use.

## Coordinate System Conventions

### Standard 3D Animation (Y-Up, Right-Handed)

Most modern 3D software uses Y-up, right-handed coordinate systems:

- **X-axis**: Left/Right (Red) - Positive = Right
- **Y-axis**: Up/Down (Green) - Positive = Up
- **Z-axis**: Forward/Back (Blue) - Positive = Forward/Toward camera

### Anatomical Planes → 3D Axes Conversion

| Anatomical Plane | Movement | 3D Rotation Axis | Positive Direction |
|-----------------|----------|------------------|-------------------|
| Sagittal | Flexion/Extension | X-axis | Extension (backward bend) |
| Frontal/Coronal | Abduction/Adduction | Z-axis | Abduction (away from body) |
| Transverse/Horizontal | Internal/External Rotation | Y-axis | External rotation |

### Key Conventions

- **Flexion**: Decreasing angle between bones (bending forward/closing)
- **Extension**: Increasing angle between bones (bending backward/opening)
- **Abduction**: Moving away from body midline
- **Adduction**: Moving toward body midline
- **Internal Rotation**: Rotating toward body midline
- **External Rotation**: Rotating away from body midline

---

## Joint Reference Data

### 1. HIP JOINT (Ball-and-Socket, 3-Axis)

**Joint Type**: Ball-and-socket (multiaxial)
**Bone Names**: UpperLeg, Thigh, Hip, Hips (parent)
**Freedom**: 3 rotational axes

#### Anatomical Range of Motion

| Movement | Axis | Anatomical Max | Safe Working Range | Notes |
|----------|------|----------------|-------------------|-------|
| Flexion | X+ | 110-125° | 100° | Knee bent allows greater range |
| Extension | X- | 10-30° | 15° | Limited by hip capsule |
| Abduction | Z+ | 30-50° | 40° | Away from midline |
| Adduction | Z- | 20-30° | 25° | Toward/across midline |
| External Rotation | Y+ | 40-60° | 45° | Foot turns outward |
| Internal Rotation | Y- | 30-40° | 35° | Foot turns inward |

#### Recommended Constraint Values (Degrees)

```javascript
{
  "UpperLeg_L": {
    "type": "ball",
    "rotationMin": { "x": -15, "y": -35, "z": -25 },
    "rotationMax": { "x": 100, "y": 45, "z": 40 }
  }
}
```

#### Common Rigging Mistakes

- Allowing hyperextension beyond 30° (gymnast poses are exceptions)
- Not limiting rotation when leg is extended vs. flexed
- Symmetric internal/external rotation limits (external should be greater)

---

### 2. KNEE JOINT (Hinge, 1-Axis)

**Joint Type**: Hinge (uniaxial)
**Bone Names**: LowerLeg, Shin, Knee, Calf
**Freedom**: 1 rotational axis (X-axis)

#### Anatomical Range of Motion

| Movement | Axis | Anatomical Max | Safe Working Range | Notes |
|----------|------|----------------|-------------------|-------|
| Flexion | X+ | 135-150° | 130° | Heel toward buttock |
| Extension | X- | 0-5° | 0° | Straight leg (no hyperextension normally) |

#### Recommended Constraint Values (Degrees)

```javascript
{
  "LowerLeg_L": {
    "type": "hinge",
    "rotationMin": { "x": 0, "y": -3, "z": -3 },      // Added ±3° wiggle
    "rotationMax": { "x": 130, "y": 3, "z": 3 },      // Natural joint play
    "primaryAxis": "x",                               // Flexion axis
    "wiggleAmount": 3                                 // Degrees of secondary freedom
  }
}
```

#### Common Rigging Mistakes

- Allowing backward knee bending (hyperextension) - knees don't bend backward!
- Enabling Y or Z rotation (knees only flex/extend on X-axis)
- Not locking at 0° extension (should be hard stop)

---

### 3. ANKLE JOINT (Universal, 2-Axis)

**Joint Type**: Universal (biaxial)
**Bone Names**: Foot, Ankle
**Freedom**: 2 rotational axes (primarily X and Z)

#### Anatomical Range of Motion

| Movement | Axis | Anatomical Max | Safe Working Range | Notes |
|----------|------|----------------|-------------------|-------|
| Dorsiflexion (toes up) | X+ | 10-25° | 20° | Toes toward shin |
| Plantarflexion (point) | X- | 40-55° | 45° | Ballet point, push-off |
| Inversion (sole inward) | Z- | 20-30° | 25° | Supination component |
| Eversion (sole outward) | Z+ | 10-20° | 15° | Pronation component |
| Y-axis rotation | Y | ±5° | ±5° | Minimal, usually coupled |

#### Recommended Constraint Values (Degrees)

```javascript
{
  "Foot_L": {
    "type": "universal",
    "rotationMin": { "x": -45, "y": -5, "z": -25 },
    "rotationMax": { "x": 20, "y": 5, "z": 15 }
  }
}
```

#### Common Rigging Mistakes

- Equal inversion/eversion limits (inversion is much greater)
- Not accounting for plantarflexion during toe-off in walking
- Allowing too much Y-axis rotation (ankle doesn't twist much)

---

### 4. SHOULDER JOINT (Ball-and-Socket, 3-Axis)

**Joint Type**: Ball-and-socket (multiaxial)
**Bone Names**: UpperArm, Arm, Shoulder, Clavicle (parent)
**Freedom**: 3 rotational axes - greatest ROM of any joint

#### Anatomical Range of Motion

| Movement | Axis | Anatomical Max | Safe Working Range | Notes |
|----------|------|----------------|-------------------|-------|
| Flexion (forward) | X+ | 180° | 170° | Arm overhead forward |
| Extension (backward) | X- | 45-60° | 50° | Arm behind back |
| Abduction (lateral) | Z+ | 170-180° | 160° | Arm overhead sideways |
| Adduction (medial) | Z- | 30-50° | 40° | Arm across chest |
| External Rotation | Y+ | 80-90° | 80° | Palm up when elbow bent |
| Internal Rotation | Y- | 60-100° | 70° | Palm down/behind back |

#### Recommended Constraint Values (Degrees)

```javascript
{
  "UpperArm_L": {
    "type": "ball",
    "rotationMin": { "x": -50, "y": -70, "z": -40 },
    "rotationMax": { "x": 170, "y": 80, "z": 160 }
  }
}
```

#### Common Rigging Mistakes

- Not accounting for scapular movement (shoulder blade rotation adds ~60° to abduction)
- Symmetric flexion/extension limits (flexion is much greater)
- Ignoring coupled rotations (rotation changes with arm position)

---

### 5. ELBOW JOINT (Hinge, 1-Axis)

**Joint Type**: Hinge (uniaxial)
**Bone Names**: LowerArm, Forearm, Elbow
**Freedom**: 1 rotational axis (X-axis)

#### Anatomical Range of Motion

| Movement | Axis | Anatomical Max | Safe Working Range | Notes |
|----------|------|----------------|-------------------|-------|
| Flexion | X+ | 145-150° | 140° | Hand toward shoulder |
| Extension | X- | 0-5° | 0° | Straight arm |

#### Recommended Constraint Values (Degrees)

```javascript
{
  "LowerArm_L": {
    "type": "hinge",
    "rotationMin": { "x": 0, "y": -3, "z": -3 },      // Added ±3° wiggle
    "rotationMax": { "x": 140, "y": 3, "z": 3 },      // Natural joint play
    "primaryAxis": "x",                               // Flexion axis (auto-detected)
    "wiggleAmount": 3                                 // Degrees of secondary freedom
  }
}
```

#### Common Rigging Mistakes

- Allowing backward elbow bending - elbows don't bend backward!
- Enabling Y or Z rotation (pure hinge joint on X-axis only)
- Confusing forearm rotation (pronation/supination) with elbow rotation

**IMPORTANT**: Forearm rotation (palm up/down) occurs at the radioulnar joints, NOT the elbow!

---

### 6. WRIST JOINT (Universal, 2-Axis)

**Joint Type**: Universal (biaxial)
**Bone Names**: Hand, Wrist
**Freedom**: 2 rotational axes (X and Z primarily)

#### Anatomical Range of Motion

| Movement | Axis | Anatomical Max | Safe Working Range | Notes |
|----------|------|----------------|-------------------|-------|
| Flexion (palmar) | X+ | 70-90° | 80° | Palm toward forearm |
| Extension (dorsal) | X- | 70-85° | 70° | Back of hand toward forearm |
| Radial Deviation | Z+ | 15-25° | 20° | Thumb side up |
| Ulnar Deviation | Z- | 30-40° | 35° | Pinky side up |

#### Forearm Rotation (Radioulnar Joints - NOT Wrist)

| Movement | Axis | Anatomical Max | Safe Working Range | Notes |
|----------|------|----------------|-------------------|-------|
| Pronation | Y+ | 75-90° | 80° | Palm down |
| Supination | Y- | 85-90° | 85° | Palm up |

#### Recommended Constraint Values (Degrees)

```javascript
{
  "Hand_L": {
    "type": "universal",
    "rotationMin": { "x": -70, "y": 0, "z": -35 },
    "rotationMax": { "x": 80, "y": 0, "z": 20 }
  },
  "LowerArm_L": {
    // Y-axis for forearm twist (if rig supports it)
    "twistMin": -85,
    "twistMax": 80
  }
}
```

#### Common Rigging Mistakes

- Confusing wrist movement with forearm rotation
- Equal radial/ulnar deviation (ulnar is greater)
- Not separating forearm twist from wrist rotation in rig

---

### 7. SPINE SEGMENTS (Multiple, Limited Rotation)

**Joint Type**: Limited multiaxial (each vertebra)
**Bone Names**: Spine, Spine1, Spine2, Chest, etc.
**Freedom**: 3 axes but very limited per segment

#### Cervical Spine (Neck) - C1-C7

| Movement | Axis | Total Range | Per Vertebra | Safe Working | Notes |
|----------|------|-------------|--------------|--------------|-------|
| Flexion | X+ | 45-60° | ~8-10°/segment | 50° total | Chin to chest |
| Extension | X- | 45-75° | ~8-12°/segment | 60° total | Looking up |
| Lateral Bend | Z± | 45° each | ~6-8°/segment | 40° each | Ear to shoulder |
| Rotation | Y± | 85° each | ~12-15°/segment | 75° each | Looking over shoulder |

#### Thoracic Spine (Upper/Mid Back) - T1-T12

| Movement | Axis | Total Range | Per Vertebra | Safe Working | Notes |
|----------|------|-------------|--------------|--------------|-------|
| Flexion | X+ | 26° | ~2-3°/segment | 25° total | Limited by ribs |
| Extension | X- | 22° | ~2°/segment | 20° total | Limited by ribs |
| Lateral Bend | Z± | 30° each | ~2.5°/segment | 25° each | Side bend |
| Rotation | Y± | 47° each | ~4°/segment | 40° each | Torso twist |

#### Lumbar Spine (Lower Back) - L1-L5

| Movement | Axis | Total Range | Per Vertebra | Safe Working | Notes |
|----------|------|-------------|--------------|--------------|-------|
| Flexion | X+ | 50-60° | ~10-12°/segment | 55° total | Bending forward |
| Extension | X- | 25-35° | ~5-7°/segment | 30° total | Arching back |
| Lateral Bend | Z± | 30° each | ~6°/segment | 25° each | Side bend |
| Rotation | Y± | 15° each | ~3°/segment | 13° each | VERY limited |

#### Recommended Constraint Values (Degrees)

```javascript
{
  // Neck (aggregate of cervical vertebrae)
  "Neck": {
    "type": "limited-ball",
    "rotationMin": { "x": -60, "y": -75, "z": -40 },
    "rotationMax": { "x": 50, "y": 75, "z": 40 }
  },

  // Upper spine (aggregate of upper thoracic)
  "Spine2": {
    "type": "limited-ball",
    "rotationMin": { "x": -15, "y": -30, "z": -20 },
    "rotationMax": { "x": 20, "y": 30, "z": 20 }
  },

  // Lower spine (aggregate of lower thoracic + lumbar)
  "Spine": {
    "type": "limited-ball",
    "rotationMin": { "x": -30, "y": -15, "z": -25 },
    "rotationMax": { "x": 55, "y": 15, "z": 25 }
  }
}
```

#### Common Rigging Mistakes

- Single spine bone with unrestricted rotation (should be multiple segments)
- Equal flexion/extension in lumbar (flexion is much greater)
- Too much lumbar rotation (lumbar spine barely rotates!)
- Not distributing motion across multiple spine bones

---

### 8. NECK (2-Axis Dominant)

**Joint Type**: Complex multiaxial (7 cervical vertebrae)
**Bone Names**: Neck, Head (child)
**Freedom**: 3 axes, but typically rigged as head + neck

#### Anatomical Range of Motion

See Cervical Spine above for detailed vertebral data.

For simplified head/neck rig:

| Movement | Axis | Anatomical Max | Safe Working Range | Notes |
|----------|------|----------------|-------------------|-------|
| Flexion (nod yes) | X+ | 45-60° | 50° | Chin down |
| Extension (look up) | X- | 45-75° | 60° | Look at ceiling |
| Lateral Bend | Z± | 45° each | 40° each | Ear to shoulder |
| Rotation (shake no) | Y± | 85° each | 75° each | Turn head |

#### Recommended Constraint Values (Degrees)

```javascript
{
  "Head": {
    "type": "ball",
    "rotationMin": { "x": -60, "y": -75, "z": -40 },
    "rotationMax": { "x": 50, "y": 75, "z": 40 }
  }
}
```

---

## Safe Working Ranges vs. Anatomical Maximums

### General Guidelines

| Range Type | Percentage | Use Case |
|------------|-----------|----------|
| Anatomical Maximum | 100% | Medical/clinical measurement |
| Safe Working Range | 80-90% | Normal animation, realistic poses |
| Functional Range | 60-80% | Common daily activities |
| Conservative Range | 50-70% | Subtle, naturalistic animation |

### Rationale

- **Anatomical maximums** often require extreme effort or flexibility
- **Safe working ranges** prevent mesh deformation issues and look natural
- **Functional ranges** cover 90% of normal human movement
- Going beyond safe ranges requires careful weight painting and mesh topology

---

## Auto-Detection Rules

### Bone Name → Joint Type Mapping

```javascript
const jointTypeDetection = {
  // Hinge joints (1-axis)
  hinge: [
    /knee/i, /shin/i, /lowerleg/i, /calf/i,
    /elbow/i, /lowerarm/i, /forearm/i
  ],

  // Ball-and-socket (3-axis)
  ball: [
    /hip/i, /thigh/i, /upperleg/i, /pelvis/i,
    /shoulder/i, /upperarm/i, /clavicle/i,
    /neck/i, /head/i
  ],

  // Universal (2-axis)
  universal: [
    /ankle/i, /foot/i,
    /wrist/i, /hand/i
  ],

  // Limited rotation (spine)
  limited: [
    /spine/i, /chest/i, /back/i, /torso/i
  ]
};
```

### Symmetry Detection

```javascript
const mirrorPairs = {
  "_L": "_R",
  "_l": "_r",
  ".L": ".R",
  ".l": ".r",
  "Left": "Right",
  "left": "right"
};
```

---

## Validation System

### Constraint Validation Rules

```javascript
function validateConstraint(boneName, constraint) {
  const jointData = getJointData(boneName);
  const warnings = [];

  // Check if range exceeds anatomical maximum
  if (constraint.rotationMax.x > jointData.anatomicalMax.x) {
    warnings.push(`X-axis exceeds anatomical max (${jointData.anatomicalMax.x}°)`);
  }

  // Check if hinge joint has multi-axis rotation
  if (jointData.type === 'hinge') {
    if (constraint.rotationMax.y !== 0 || constraint.rotationMax.z !== 0) {
      warnings.push('Hinge joints should only rotate on primary axis');
    }
  }

  // Check for backward knee/elbow
  if (boneName.match(/knee|elbow/i)) {
    if (constraint.rotationMin.x < 0) {
      warnings.push('Knees and elbows should not hyperextend (negative X)');
    }
  }

  return warnings;
}
```

---

## Common Anatomical Mistakes in Rigging

### Critical Errors to Avoid

1. **Backward Bending Hinges**
   - ❌ Knees bending backward
   - ❌ Elbows bending backward
   - ✅ Set minimum to 0°, maximum to flexion limit

2. **Multi-Axis Hinge Joints**
   - ❌ Knees/elbows rotating on Y or Z axes
   - ✅ Lock Y and Z to 0°, only allow X-axis rotation

3. **Symmetric Ball Joints**
   - ❌ Equal flexion/extension limits on hips/shoulders
   - ✅ Much greater flexion than extension

4. **Excessive Lumbar Rotation**
   - ❌ Allowing 45°+ rotation in lower spine
   - ✅ Limit to 15° (lumbar barely rotates!)

5. **Single Spine Bone**
   - ❌ One bone for entire spine with full rotation
   - ✅ Multiple bones with distributed, limited rotation

6. **Wrist/Forearm Confusion**
   - ❌ Palm up/down at wrist joint
   - ✅ Pronation/supination at radioulnar (forearm twist)

7. **Ignoring Coupled Motion**
   - ❌ Independent axes on spine
   - ✅ Lateral bending couples with slight rotation

8. **Equal Inversion/Eversion**
   - ❌ Symmetric ankle side-to-side limits
   - ✅ Inversion (25°) is greater than eversion (15°)

---

## Implementation Recommendations

### Auto-Apply System

```javascript
function autoApplyConstraints(skeleton) {
  skeleton.bones.forEach(bone => {
    const jointType = detectJointType(bone.name);
    const defaultConstraints = getDefaultConstraints(jointType, bone.name);

    if (defaultConstraints) {
      applyConstraint(bone, defaultConstraints);
      console.log(`Applied ${jointType} constraints to ${bone.name}`);
    }
  });
}
```

### User Guidance System

```javascript
function provideConstraintGuidance(boneName, currentValues) {
  const recommended = getRecommendedConstraints(boneName);
  const anatomicalMax = getAnatomicalMaximums(boneName);

  return {
    current: currentValues,
    recommended: recommended,
    anatomicalMax: anatomicalMax,
    warnings: validateConstraint(boneName, currentValues),
    tips: getConstraintTips(boneName)
  };
}
```

### Visual Feedback

- **Green arc**: Within safe working range (80-90% of max)
- **Yellow arc**: Beyond safe range but anatomically possible
- **Red arc**: Exceeds anatomical maximum (invalid)
- **Gray zone**: Locked/restricted rotation

---

## Reference Sources

### Medical/Biomechanical Sources

1. **Range of Motion Normative Values** - Physiopedia
   - Comprehensive clinical ROM data
   - Age and gender considerations

2. **American Academy of Orthopaedic Surgeons (AAOS)**
   - Standard goniometric measurements
   - Clinical assessment protocols

3. **Biomechanics Research Papers**
   - Hip rotation studies (PMC4339156)
   - Spine biomechanics analysis
   - Joint constraint modeling

4. **Anatomy Textbooks**
   - Gray's Anatomy
   - Clinically Oriented Anatomy (Moore)
   - Biomechanics of Human Movement

### 3D Animation Sources

1. **Character Rigging Best Practices**
   - Autodesk Maya documentation
   - Blender rigging guidelines
   - Industry standard workflows

2. **IK Solver Documentation**
   - Three.js CCDIKSolver
   - Unity IK systems
   - Animation rigging tools

---

## Practical Usage Examples

### Example 1: Auto-Detect and Apply

```javascript
// Load model
const model = loadGLB('character.glb');
const skeleton = model.skeleton;

// Auto-detect joint types
skeleton.bones.forEach(bone => {
  if (bone.name.match(/knee|elbow/i)) {
    applyHingeConstraint(bone, { min: 0, max: 140, axis: 'x' });
  }
  else if (bone.name.match(/hip|shoulder/i)) {
    applyBallConstraint(bone, getBallConstraints(bone.name));
  }
  else if (bone.name.match(/ankle|wrist/i)) {
    applyUniversalConstraint(bone, getUniversalConstraints(bone.name));
  }
});
```

### Example 2: User Override with Validation

```javascript
// User sets custom constraint
function setUserConstraint(boneName, constraint) {
  const warnings = validateConstraint(boneName, constraint);

  if (warnings.length > 0) {
    showWarningDialog(
      `Constraint on ${boneName} has issues:\n${warnings.join('\n')}\n\n` +
      `Continue anyway?`
    );
  }

  applyConstraint(boneName, constraint);
}
```

### Example 3: Mirror Constraints

```javascript
// Set left knee, auto-mirror to right
function mirrorConstraint(boneName, constraint) {
  const mirrorBone = getMirrorBone(boneName);
  if (mirrorBone) {
    // Mirror X and Y, but flip Z for symmetry
    const mirroredConstraint = {
      rotationMin: {
        x: constraint.rotationMin.x,
        y: constraint.rotationMin.y,
        z: -constraint.rotationMax.z  // Flip Z
      },
      rotationMax: {
        x: constraint.rotationMax.x,
        y: constraint.rotationMax.y,
        z: -constraint.rotationMin.z  // Flip Z
      }
    };
    applyConstraint(mirrorBone, mirroredConstraint);
  }
}
```

---

## Quick Reference Tables

### Joint Types Summary

| Joint | Type | Axes | Primary Bone Names | Key Characteristic |
|-------|------|------|-------------------|-------------------|
| Hip | Ball | 3 | UpperLeg, Thigh | Greatest flexion, limited extension |
| Knee | Hinge | 1 | LowerLeg, Shin | One-way only, no hyperextension |
| Ankle | Universal | 2 | Foot, Ankle | Dorsi/plantar + inversion/eversion |
| Shoulder | Ball | 3 | UpperArm, Shoulder | Largest ROM of any joint |
| Elbow | Hinge | 1 | LowerArm, Forearm | One-way only, no hyperextension |
| Wrist | Universal | 2 | Hand, Wrist | Flexion/extension + radial/ulnar |
| Spine | Limited | 3 | Spine, Chest | Very limited per segment |
| Neck | Ball | 3 | Neck, Head | High mobility, all directions |

### Axis Convention Summary

| Axis | Color | Direction | Typical Rotation |
|------|-------|-----------|-----------------|
| X | Red | Left ← → Right | Flexion/Extension |
| Y | Green | Down ↓ ↑ Up | Internal/External rotation |
| Z | Blue | Back ← → Forward | Abduction/Adduction |

### Safe Working Range Multipliers

| Joint Type | Conservative | Realistic | Athletic | Extreme |
|-----------|-------------|-----------|----------|---------|
| Hinge (Knee/Elbow) | 0.7 | 0.85 | 0.95 | 1.0 |
| Ball (Hip/Shoulder) | 0.7 | 0.85 | 0.95 | 1.1 |
| Universal (Ankle/Wrist) | 0.75 | 0.85 | 0.95 | 1.0 |
| Spine | 0.6 | 0.8 | 0.9 | 1.0 |

---

## Glossary

**Abduction**: Movement away from the midline of the body
**Adduction**: Movement toward the midline of the body
**Anatomical Position**: Standing upright, arms at sides, palms forward
**Dorsiflexion**: Toes moving toward shin (ankle)
**Extension**: Increasing the angle between bones
**Eversion**: Sole of foot turning outward
**Flexion**: Decreasing the angle between bones
**Inversion**: Sole of foot turning inward
**Plantarflexion**: Toes pointing downward (ankle)
**Pronation**: Palm turning downward (forearm)
**Supination**: Palm turning upward (forearm)
**Radial Deviation**: Wrist bending toward thumb side
**Ulnar Deviation**: Wrist bending toward pinky side

---

## APPENDIX A: Secondary Axis Wiggle Room (Version 2.0)

### The Reality of "Single-Axis" Joints

**Medical Truth:** No joint is truly uniaxial.

Even the most constrained hinge joints (knees, elbows) have measurable secondary axis movement:

| Joint | Primary Axis | Secondary Y-Axis | Secondary Z-Axis | Notes |
|-------|-------------|------------------|------------------|-------|
| Knee | 0-130° flexion | ±5° rotation | ±3° abduction | Rotation increases when flexed |
| Elbow | 0-140° flexion | ±3° rotation | ±2° deviation | Very limited secondary movement |
| Ankle (Primary) | 45° plantar, 20° dorsi | ±5° rotation | N/A | Two-axis joint |
| Ankle (Secondary) | N/A | ±5° rotation | 25° inversion, 15° eversion | Coupled with primary |

### Why Wiggle Room Matters

**1. Natural Movement Quality**
- Zero-locked axes create robotic animation
- Real joints have "play" (ligament elasticity, cartilage compression)
- Allows micro-adjustments during weight shifting

**2. IK Solver Stability**
- Absolute locks can cause solver oscillation
- Small wiggle room provides solution space
- Prevents gimbal lock situations

**3. Mesh Deformation Prevention**
- Rigid constraints with wrong axis = severe deformation
- Wiggle room compensates for axis detection errors
- Allows natural skin sliding over joints

**4. Coupled Motion Modeling**
- Knee rotation when flexed >60° (screw-home mechanism)
- Ankle inversion couples with plantarflexion
- Shoulder rotation changes available ROM in other axes

### Recommended Wiggle Amounts by Joint Type

**Hinge Joints (Knees, Elbows):**
```javascript
{
  "primaryAxis": {
    "flexion": 130,     // Full ROM
    "extension": 0      // No hyperextension
  },
  "secondaryAxes": {
    "wiggle": 5,        // ±5° base wiggle
    "coupledWiggle": 10 // When primary >60° flexed, allow ±10°
  }
}
```

**Ball Joints (Hips, Shoulders):**
```javascript
{
  // All axes active - no "wiggle" concept
  // Each axis has full independent ROM
  "flexionAxis": { min: -15, max: 100 },
  "abductionAxis": { min: -25, max: 40 },
  "rotationAxis": { min: -35, max: 45 }
}
```

**Universal Joints (Ankles, Wrists):**
```javascript
{
  "primaryAxes": {
    "axis1": { min: -45, max: 20 },   // Dorsi/plantar
    "axis2": { min: -25, max: 15 }    // Inversion/eversion
  },
  "tertiaryAxis": {
    "wiggle": 5  // ±5° on third axis
  }
}
```

---

## APPENDIX B: Axis-Agnostic Constraint Format (Version 2.0)

### The Multi-Platform Problem

**Different rigs, different axes:**

| Platform | Knee Flexion Axis | Elbow Flexion Axis | Hip Axes |
|----------|-------------------|-------------------|----------|
| Meshy3D | X | X | X/Y/Z |
| TripoAI | ? | ? | ? |
| Character Creator | Y | Y | Different |
| Mixamo | X | X | X/Y/Z |
| UE5 Mannequin | Z | Z | Different |
| Blender Rigify | Varies | Varies | Varies |

**Problem:** Can't hardcode "knee = X-axis" - it varies per rig!

### Universal Constraint Format

**Instead of absolute X/Y/Z values, use anatomical terms:**

```javascript
{
  "boneName": "LowerLeg_L",
  "jointType": "hinge",

  // Anatomical constraints (axis-agnostic)
  "anatomical": {
    "flexion": {
      "max": 130,           // Forward bend
      "min": 0,             // No hyperextension
      "axis": "auto"        // System detects which local axis
    },
    "secondaryWiggle": 5    // ±5° on other axes
  },

  // Auto-detected axis mapping (filled by system)
  "detectedAxes": {
    "flexion": "x",         // Auto-detected primary axis
    "localFrame": Matrix3   // Bone's local coordinate system
  },

  // Applied constraints (computed from anatomical + detected axes)
  "applied": {
    "x": { "min": 0, "max": 130 },    // Primary axis
    "y": { "min": -5, "max": 5 },     // Wiggle
    "z": { "min": -5, "max": 5 }      // Wiggle
  }
}
```

### Workflow

1. **Define** anatomical constraints (flexion/extension/rotation)
2. **Detect** bone's local axis orientation
3. **Map** anatomical → local axes
4. **Apply** to IK solver
5. **Validate** no mesh deformation

---

## APPENDIX C: Coupled Motion Modeling

### What is Coupled Motion?

Some joint movements are interdependent - moving one axis affects ROM on another.

**Examples:**

**Knee:**
- Straight knee: Very limited rotation (±2°)
- Flexed knee (>60°): Allows ±10-15° internal/external rotation
- **Why:** Tibial rotation unlocked when knee bends (screw-home mechanism)

**Shoulder:**
- Arm at side: Limited flexion (140°)
- Arm abducted 90°: Increased flexion possible (180°)
- **Why:** Scapular movement adds ~60° to ROM

**Ankle:**
- Neutral position: Equal inversion/eversion
- Plantarflexed: Inversion increases, eversion decreases
- **Why:** Subtalar joint axis orientation changes

### Implementation Approach

```javascript
function getConstraintsWithCoupling(bone, currentRotation) {
  const baseConstraints = getBaseConstraints(bone);

  // Check if coupling rules apply
  if (bone.name.match(/knee/i)) {
    const flexionAngle = Math.abs(currentRotation.x); // Assuming X is flexion

    if (flexionAngle > 60) {
      // Knee is flexed - allow more rotation
      const bonus = (flexionAngle - 60) * 0.15; // 0.15° per degree flexed
      baseConstraints.y.min -= bonus;
      baseConstraints.y.max += bonus;
    }
  }

  return baseConstraints;
}
```

**Note:** Coupled motion is **advanced feature** - defer to Phase 2 after basic axis detection works.

---

**Document Version**: 2.0 (Draft)
**Last Updated**: October 7, 2025
**Author**: Compiled from medical biomechanics research for Black Box IK Animator
**License**: MIT - Free to use for animation and rigging systems
**Status**: In Development - Universal Constraint System
