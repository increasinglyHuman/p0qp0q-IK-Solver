# Production Deployment

## Live URLs

**Main Site:** https://poqpoq.com/ik-solver/

**Demos:**
- Octahedral Bone Visualization: https://poqpoq.com/ik-solver/octahedral-demo.html
- Auto-Constraint Builder: https://poqpoq.com/ik-solver/auto-constraint-demo.html
- Basic Leg IK: https://poqpoq.com/ik-solver/basic-leg-ik.html
- Bone Alignment Compare: https://poqpoq.com/ik-solver/compare-bone-alignments.html

## Deployed Files

### Core Solver
- `/var/www/ik-solver/p0qp0q-IK-Solver.js` - Main IK solver
- `/var/www/ik-solver/OctahedralBoneHelper.js` - Professional bone visualization (v1.0.1)
- `/var/www/ik-solver/AutoConstraintBuilder.js` - Zero-config IK setup

### Dependencies
- `/var/www/ik-solver/animation-utils/` - Biomechanical utilities
  - BoneMapper.js
  - BoneAxisDetector.js
  - ConstraintHelper.js
  - BiomechanicalData.js
  - CreatureTypes.js

### Models
- `/var/www/ik-solver/models/octahedralBoneZup.glb` - Blender bone template
- `/var/www/ik-solver/models/meshy-character.glb` - Humanoid test model
- `/var/www/ik-solver/models/creatures/` - Creature library
  - Centaur, Griffin, Unicorn (mythological)
  - Bear, Deer (quadrupeds - rigged)
  - Humanoid base model

## Apache Configuration

Added to `/etc/apache2/sites-enabled/poqpoq-ssl.conf`:

```apache
# p0qp0q IK Solver - Universal IK with octahedral bones
Alias /ik-solver /var/www/ik-solver
<Directory /var/www/ik-solver>
    Options Indexes FollowSymLinks
    AllowOverride None
    Require all granted

    AddType model/gltf-binary .glb
    AddType model/gltf+json .gltf
    AddType application/javascript .js
    AddType text/html .html
    AddType text/css .css
</Directory>
```

## Deployment Date

**October 10, 2025** - Initial production deployment
