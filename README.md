# p0qp0q IK Solver

**Enhanced Inverse Kinematics solver for Three.js with biomechanical constraints and multi-axis bone support**

## Overview

p0qp0q-IK-Solver (pronounced "pock-pock") is a modified version of Three.js CCDIKSolver enhanced with:

- **Swing-Twist Constraint System** - Biomechanically accurate joint limits
- **Multi-Axis Bone Support** - Works with any bone orientation (X, Y, or Z primary axis)
- **Scale-Aware Precision** - Handles tiny models (0.01 scale) and huge models equally well
- **Octahedral Bone Visualization** - Professional-grade bone display (like Maya/Blender)
- **Educational Features** - Visual constraint feedback and joint limit displays

## Based On

This solver is based on Three.js CCDIKSolver (MIT License)
- Original: https://github.com/mrdoob/three.js/blob/master/examples/jsm/animation/CCDIKSolver.js
- Copyright © 2010-2025 three.js authors
- Enhanced by Allen Partridge © 2025

## Key Enhancements

### 1. Swing-Twist Constraints (vs. Euler Constraints)

**Original CCDIKSolver**:
```javascript
rotationMin: new Vector3(0, 0, 0),
rotationMax: new Vector3(130, 0, 0)  // Hardcoded X-axis
```

**p0qp0q-IK-Solver**:
```javascript
swingTwistConstraint: {
  type: 'hinge',                           // Anatomical joint type
  twistAxis: new Vector3(0, 1, 0),         // Auto-detected or specified
  twistMin: 0,                             // Radians (extension)
  twistMax: degToRad(130),                 // Radians (flexion)
  swingRadius: degToRad(5)                 // Radians (wiggle room)
}
```

### 2. Multi-Axis Support

Works with bones oriented along ANY axis:
- Meshy3D models (X-axis knees)
- Mixamo models (Y-axis knees)
- Character Creator (Z-axis or inverted axes)
- Custom rigs (any orientation)

**Auto-detects** bone orientation and applies constraints to the correct axis.

### 3. Octahedral Bone Visualization

Professional bone display system:
- Directional octahedral bones (show bone orientation)
- Joint spheres at connections
- Constraint arcs showing valid ranges
- Color-coded by bone type (red=hinge, blue=ball, green=universal)

## Installation

```bash
npm install p0qp0q-ik-solver
```

Or use directly:
```javascript
import { P0qP0qIKSolver } from './p0qp0q-IK-Solver.js';
```

## Usage

```javascript
import * as THREE from 'three';
import { P0qP0qIKSolver } from 'p0qp0q-ik-solver';

// Define IK chains with swing-twist constraints
const iks = [
  {
    target: targetBoneIndex,
    effector: effectorBoneIndex,
    links: [
      {
        index: hipBoneIndex
        // Ball joint - no constraints yet (Phase 3)
      },
      {
        index: kneeBoneIndex,
        swingTwistConstraint: {
          type: 'hinge',
          twistAxis: new THREE.Vector3(0, 1, 0),  // Auto-detected in Phase 3!
          twistMin: 0,                             // No hyperextension
          twistMax: THREE.MathUtils.degToRad(130), // Max flexion
          swingRadius: THREE.MathUtils.degToRad(5) // ±5° wiggle
        }
      },
      {
        index: ankleBoneIndex
        // Universal joint - Phase 3
      }
    ]
  }
];

// Create solver
const ikSolver = new P0qP0qIKSolver(skinnedMesh, iks);

// Update in animation loop
ikSolver.update();
```

## Roadmap

- [x] Fork Three.js CCDIKSolver ✅
- [x] Add scale-aware precision thresholds ✅ (Phase 1 complete!)
- [x] Implement swing-twist constraint system (INSIDE solver loop!) ✅ (Phase 2 complete!)
- [ ] Multi-axis bone orientation support (Week 2) - Integration with BoneAxisDetector
- [ ] Octahedral bone visualization (Week 3) - Professional Maya/Blender-style bones
- [ ] Comprehensive test suite (Week 4)
- [ ] Documentation and examples (Week 5)
- [ ] npm package release (v1.0.0)

## Development Status

**Current Phase:** Phase 2 Complete - Swing-Twist Constraints Integrated!
**Target Release:** Q1 2025
**Status:** Alpha (core features working, testing in progress)

**Latest:** October 7, 2025 - Swing-twist constraints now applied INSIDE solver loop (correct architecture!)

## Contributing

This is currently a solo project by Allen Partridge for Black Box Studios.

## License

MIT License - See [LICENSE](LICENSE) for full text

Includes code from Three.js (MIT License) - See [LICENSE-ThreeJS.txt](LICENSE-ThreeJS.txt)

## Author

Allen Partridge (p0qp0q)
- GitHub: [@increasinglyHuman](https://github.com/increasinglyHuman)
- Web: [poqpoq.com](https://poqpoq.com)
- Project: Black Box Animator

---

*"pock-pock" - Easy to say, hard to forget* 🎯
