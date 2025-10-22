# Why Aren't Bones Aligning Automatically?
**Investigation:** October 22, 2025

---

## 🎯 THE QUESTION

**What SHOULD happen:**
```
Dog skeleton:
Hips → backleg → backleg0 → backleg1 → backleg2

Each bone should point to its child:
- Hips bone points at backleg
- backleg bone points at backleg0
- backleg0 bone points at backleg1
- etc.

Result: Clean visual chain
```

**What IS happening:**
```
Bones pointing in random directions like porcupine quills ❌
```

**WHY?** 🤔

---

## 🔍 TRACING THE CODE

### Step 1: Bone Creation Loop

**File:** OctahedralBoneHelper.js line 172-202

```javascript
_createBones() {
    for ( let i = 0; i < this.bones.length; i ++ ) {
        const bone = this.bones[ i ];
        const childBones = this._findAllChildBones( bone ); // ✅ Finds ALL children
        
        if ( childBones.length === 0 ) {
            this._createEndEffectorSphere( bone ); // ✅ End effectors handled
            continue;
        }
        
        // Create a bone visualization for EACH child
        for ( const childBone of childBones ) {
            const octahedron = this._createOctahedralBone( bone, childBone ); // ← HERE
            const jointSphere = this._createJointSphere( bone, childBone );
        }
    }
}
```

✅ **This is correct!** For each bone, we find ALL children and create octahedron to each.

---

### Step 2: Octahedral Bone Creation

**File:** OctahedralBoneHelper.js line 268-327

```javascript
_createOctahedralBone( bone, childBone ) {
    // Get child direction in LOCAL space
    const childLocalPos = childBone.position.clone();        // ← Child's position in parent's space
    const boneLength = childLocalPos.length();               // ← Length from parent to child
    const boneDirection = childLocalPos.clone().normalize(); // ← Direction vector (normalized)
    
    // ... create mesh ...
    
    // Rotate to point at child
    const targetDir = boneDirection.clone();     // Where we WANT to point
    const currentDir = new Vector3( 0, 1, 0 );  // Where template CURRENTLY points
    
    const rotationAxis = new Vector3().crossVectors( currentDir, targetDir ).normalize();
    const rotationAngle = currentDir.angleTo( targetDir );
    
    if ( rotationAxis.length() > 0.001 ) {
        octahedron.quaternion.setFromAxisAngle( rotationAxis, rotationAngle );
    }
    
    bone.add( octahedron ); // ← Add to bone's local space
}
```

**This LOOKS correct! So why doesn't it work?** 🤔

---

## 💡 HYPOTHESIS: The Asynchronous GLB Loading!

**WAIT!** Look at the constructor (line 87-93):

```javascript
constructor( mesh, options = {} ) {
    // ... setup ...
    
    this.isReady = false;
    
    // Load the GLB model, THEN create bones
    this._loadBoneModel().then( () => {
        this._createBones();  // ← Called AFTER GLB loads
        this.isReady = true;
    } );
}
```

**And in `_loadBoneModel()` (line 101-152):**

```javascript
async _loadBoneModel() {
    return new Promise( ( resolve, reject ) => {
        loader.load(
            this.options.modelPath,
            ( gltf ) => {
                // Extract geometry...
                this.boneTemplate = ...;
                this.sphereTemplate = ...;
                resolve();
            },
            undefined,
            ( error ) => {
                console.error( 'Error loading bone model, using procedural geometry' );
                this._createFallbackGeometry(); // ← FALLBACK!
                resolve(); // ← Resolves anyway!
            }
        );
    } );
}
```

## 🚨 **THE SMOKING GUN!**

**When GLB fails to load:**
1. Error handler triggers
2. `_createFallbackGeometry()` is called
3. Promise resolves anyway
4. `_createBones()` executes
5. **BUT uses fallback geometry!**

**The fallback geometry might NOT be +Y aligned!**

Let me check the fallback:

```javascript
_createFallbackGeometry() {
    this.boneTemplate = this._createTaperedOctahedron( this.options.octahedronTipDistance );
    this.sphereTemplate = new SphereGeometry( this.options.sphereTemplateRadius, 16, 16 );
}
```

And `_createTaperedOctahedron()` (line 209-261):

```javascript
_createTaperedOctahedron( boneLength ) {
    // Creates geometry with vertices...
    
    // Top point (short tet - where sphere goes)
    0, shortHeight, 0,  // ← This is +Y!
    
    // Bottom tip (long tet - toward child)
    - tipWidth, - longHeight, - tipWidth,  // ← This is -Y!
}
```

**WAIT!** The fallback geometry points:
- **TOP (sphere end):** +Y (up)
- **BOTTOM (child end):** -Y (down)

**But we assume in rotation code:**
```javascript
const currentDir = new Vector3( 0, 1, 0 ); // Template points +Y
```

**If the template tip points -Y, and we assume +Y, then rotation is INVERTED!** 🎯

---

## 🔍 THE BUG REVEALED!

**In `_createTaperedOctahedron()`:**
- Short tet goes UP to sphere (+Y)
- Long tet goes DOWN to child (-Y) ← **The TIP is here!**

**In `_createOctahedralBone()`:**
```javascript
const currentDir = new Vector3( 0, 1, 0 ); // Assumes tip points +Y
```

**BUT the fallback tip points -Y!** ❌

**Solution:**
```javascript
const currentDir = new Vector3( 0, -1, 0 ); // Tip points -Y (down toward child)
```

---

## ✅ THE FIX

**Change line 312:**
```javascript
// OLD (wrong for fallback):
const currentDir = new Vector3( 0, 1, 0 );

// NEW (correct for fallback):
const currentDir = new Vector3( 0, -1, 0 ); // Tip points DOWN toward child
```

**This should fix it!**

---

## 🧪 TO TEST

1. Make the change
2. Run debug test
3. Check if bones now point at children
4. Validate with real models

**If this fixes it:** The GLB template probably ALSO points -Y (or has embedded rotation)!

We might need to check the GLB alignment in Blender too!

---

**Next:** Test this hypothesis! 🎯
