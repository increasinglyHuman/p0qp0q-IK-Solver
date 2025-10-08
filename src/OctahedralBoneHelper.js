/**
 * OctahedralBoneHelper.js
 * Professional octahedral bone visualization (Maya/Blender style)
 *
 * Replaces wire bones with directional octahedrons that:
 * - Show bone orientation clearly (pointy end = child direction)
 * - Scale with bone length
 * - Color-code by joint type (hinge, ball, universal)
 * - Display constraint arcs at joints
 *
 * Copyright © 2025 Allen Partridge (p0qp0q / Black Box Studios)
 * Licensed under the MIT License
 *
 * @author Allen Partridge <p0qp0q@poqpoq.com>
 * @version 1.0.0
 */

import {
	BufferGeometry,
	Color,
	CylinderGeometry,
	Float32BufferAttribute,
	Group,
	LineBasicMaterial,
	LineLoop,
	Mesh,
	MeshBasicMaterial,
	MeshPhongMaterial,
	OctahedronGeometry,
	SphereGeometry,
	Vector3
} from 'three';

/**
 * OctahedralBoneHelper - Professional bone display
 *
 * Creates Maya/Blender-style octahedral bones:
 * - Directional (pointy end toward child bone)
 * - Scaled (matches bone length)
 * - Color-coded (by joint type)
 * - Educational (shows bone orientation)
 */
export class OctahedralBoneHelper extends Group {

	/**
	 * @param {SkinnedMesh} mesh - The skinned mesh
	 * @param {Object} options - Display options
	 */
	constructor( mesh, options = {} ) {

		super();

		this.mesh = mesh;
		this.bones = mesh.skeleton.bones;

		// Display options
		this.options = {
			boneColor: options.boneColor || 0x00aaff,
			jointColor: options.jointColor || 0xff00ff,
			hingeColor: options.hingeColor || 0xff4444,      // Red for hinges (knee, elbow)
			ballColor: options.ballColor || 0x4444ff,        // Blue for balls (hip, shoulder)
			universalColor: options.universalColor || 0x44ff44, // Green for universal (ankle, wrist)
			boneOpacity: options.boneOpacity || 0.6,
			jointRadius: options.jointRadius || 0.05,
			boneScale: options.boneScale || 1.0,
			showConstraintArcs: options.showConstraintArcs !== false,
			constraintArcColor: options.constraintArcColor || 0xffaa00,
			...options
		};

		this.boneObjects = [];
		this.jointSpheres = [];
		this.constraintArcs = [];

		this._createBones();

	}

	/**
	 * Create octahedral bones for entire skeleton
	 * @private
	 */
	_createBones() {

		for ( let i = 0; i < this.bones.length; i ++ ) {

			const bone = this.bones[ i ];
			const childBone = this._findChildBone( bone );

			if ( ! childBone ) {

				// End effector - create small sphere
				this._createEndEffectorSphere( bone );
				continue;

			}

			// Create directional octahedron
			const octahedron = this._createOctahedralBone( bone, childBone );
			this.boneObjects.push( octahedron );
			// DON'T add to helper group - already added to bone in _createOctahedralBone!

			// Create joint sphere
			const jointSphere = this._createJointSphere( bone );
			this.jointSpheres.push( jointSphere );
			// DON'T add to helper group - already added to bone in _createJointSphere!

		}

	}

	/**
	 * Create Blender-style bone geometry
	 * Two tetrahedrons: 20% up to sphere, 80% down to child
	 * @private
	 */
	_createTaperedOctahedron( boneLength ) {

		// Blender bone proportions:
		// - Short tet: 20% of length (up to sphere)
		// - Long tet: 80% of length (down to child)
		// - NARROW like actual bones!
		const baseWidth = boneLength * 0.03;    // 3% width - thin stick!
		const shortHeight = boneLength * 0.20;  // 20% up
		const longHeight = boneLength * 0.80;   // 80% down
		const tipWidth = boneLength * 0.01;     // Very narrow tip

		const positions = new Float32Array( [
			// Base square (shared by both tetrahedrons)
			- baseWidth, 0, - baseWidth,  // 0
			baseWidth, 0, - baseWidth,    // 1
			baseWidth, 0, baseWidth,      // 2
			- baseWidth, 0, baseWidth,    // 3

			// Top point (short tet - where sphere goes)
			0, shortHeight, 0,            // 4

			// Bottom tip (long tet - toward child)
			- tipWidth, - longHeight, - tipWidth,  // 5
			tipWidth, - longHeight, - tipWidth,    // 6
			tipWidth, - longHeight, tipWidth,      // 7
			- tipWidth, - longHeight, tipWidth     // 8
		] );

		const indices = [
			// Short tetrahedron (UP to sphere) - 20%
			0, 1, 4,  // Front face
			1, 2, 4,  // Right face
			2, 3, 4,  // Back face
			3, 0, 4,  // Left face

			// Long tetrahedron (DOWN to child) - 80%
			// Sides
			0, 1, 6,  0, 6, 5,  // Front
			1, 2, 7,  1, 7, 6,  // Right
			2, 3, 8,  2, 8, 7,  // Back
			3, 0, 5,  3, 5, 8,  // Left
			// Bottom
			5, 6, 7,  5, 7, 8
		];

		const geometry = new BufferGeometry();
		geometry.setAttribute( 'position', new Float32BufferAttribute( positions, 3 ) );
		geometry.setIndex( indices );
		geometry.computeVertexNormals();

		return geometry;

	}

	/**
	 * Create octahedral bone geometry pointing from bone to child
	 * @private
	 */
	_createOctahedralBone( bone, childBone ) {

		const group = new Group();

		// Get bone direction and length
		const childLocalPos = childBone.position.clone();
		const boneLength = childLocalPos.length();
		const boneDirection = childLocalPos.clone().normalize();

		// Create TAPERED octahedron (like Blender!) - wide at base, narrow at tip
		const geometry = this._createTaperedOctahedron( boneLength );

		// Determine color by joint type
		const jointType = this._detectJointType( bone );
		const color = this._getColorForJointType( jointType );

		const material = new MeshPhongMaterial( {
			color: color,
			shininess: 30,
			specular: 0x222222,
			flatShading: true,
			transparent: false,
			depthTest: false,    // Always on top!
			depthWrite: false,
			side: 2
		} );

		const octahedron = new Mesh( geometry, material );
		octahedron.renderOrder = 999;  // Render last

		// Rotate octahedron to point toward child bone
		// Default octahedron: center at origin, pointy ends at ±Y
		// Want: base (flat end) at origin, pointy end toward child
		const targetDir = boneDirection.clone();
		const currentDir = new Vector3( 0, 1, 0 );

		const rotationAxis = new Vector3().crossVectors( currentDir, targetDir ).normalize();
		const rotationAngle = currentDir.angleTo( targetDir );

		if ( rotationAxis.length() > 0.001 ) {

			octahedron.quaternion.setFromAxisAngle( rotationAxis, rotationAngle );

		}

		// Position octahedron so it extends from bone origin to child position
		// Octahedron center is at 50% of its height, so shift it up by 50%
		octahedron.position.copy( childLocalPos ).multiplyScalar( 0.5 );

		// Attach to bone's transform
		bone.add( octahedron );

		return octahedron;

	}

	/**
	 * Create joint sphere at bone position
	 * @private
	 */
	_createJointSphere( bone ) {

		// Joint sphere colored by joint TYPE (red=knee, blue=hip, etc.)
		const jointType = this._detectJointType( bone );
		const color = this._getColorForJointType( jointType );

		// Get child bone to calculate proper size
		const childBone = this._findChildBone( bone );

		if ( ! childBone ) {

			// End effector - small sphere
			const radius = 0.005;
			const geometry = new SphereGeometry( radius, 16, 16 );
			const material = new MeshPhongMaterial( {
				color: color,
				shininess: 30,
				specular: 0x222222,
				depthTest: false,
				depthWrite: false
			} );
			const sphere = new Mesh( geometry, material );
			sphere.renderOrder = 999;
			bone.add( sphere );
			return sphere;

		}

		// Calculate size relative to bone base width (10% of bone length)
		const boneLength = childBone.position.length();
		const baseWidth = boneLength * 0.10;
		const radius = baseWidth * 0.85;  // 85% of base width (10-15% smaller as you said!)

		const geometry = new SphereGeometry( radius, 16, 16 );
		const material = new MeshPhongMaterial( {
			color: color,
			shininess: 30,
			specular: 0x222222,
			transparent: false,
			depthTest: false,
			depthWrite: false,
			side: 2
		} );

		const sphere = new Mesh( geometry, material );
		sphere.renderOrder = 999;

		// Position sphere at TOP of short tetrahedron (20% up from base)
		const shortHeight = boneLength * 0.20;
		sphere.position.set( 0, shortHeight, 0 );

		// Attach to bone
		bone.add( sphere );

		return sphere;

	}

	/**
	 * Create small sphere for end effectors (hands, feet, head)
	 * @private
	 */
	_createEndEffectorSphere( bone ) {

		const geometry = new SphereGeometry( 0.04, 12, 12 );
		const material = new MeshBasicMaterial( {
			color: this.options.jointColor,
			transparent: true,
			opacity: 0.6
		} );

		const sphere = new Mesh( geometry, material );
		bone.add( sphere );

		return sphere;

	}

	/**
	 * Find first child bone
	 * @private
	 */
	_findChildBone( bone ) {

		for ( const child of bone.children ) {

			if ( child.isBone ) return child;

		}

		return null;

	}

	/**
	 * Detect joint type from bone name
	 * @private
	 */
	_detectJointType( bone ) {

		const name = bone.name.toLowerCase();

		// Hinge joints (CHECK FIRST - most specific!)
		// Include "leg" but NOT "upleg" or "upperleg"
		if ( name.match( /knee|shin|calf|elbow|forearm|lowerarm/i ) ||
		     ( name.match( /leg/i ) && ! name.match( /up|upper|thigh/i ) ) ) {

			return 'hinge';

		}

		// Universal joints (CHECK BEFORE BALL!)
		if ( name.match( /ankle|foot|toe|wrist|hand|finger|thumb/i ) ) {

			return 'universal';

		}

		// Ball joints (CHECK LAST - most general!)
		if ( name.match( /hip|thigh|upperleg|upleg|shoulder|upperarm|clavicle|neck|head|spine|chest/i ) ) {

			return 'ball';

		}

		return 'unknown';

	}

	/**
	 * Get color for joint type
	 * @private
	 */
	_getColorForJointType( jointType ) {

		switch ( jointType ) {

			case 'hinge': return this.options.hingeColor;
			case 'ball': return this.options.ballColor;
			case 'universal': return this.options.universalColor;
			default: return this.options.boneColor;

		}

	}

	/**
	 * Get joint sphere radius based on bone importance
	 * @private
	 */
	_getJointRadius( bone ) {

		// Get child bone to measure bone length (for scale-relative sizing)
		const childBone = this._findChildBone( bone );
		let baseRadius = 0.01;  // Default tiny for 0.01 scale models

		if ( childBone ) {

			const boneLength = childBone.position.length();
			baseRadius = boneLength * 0.15;  // 15% of bone length

		}

		const name = bone.name.toLowerCase();

		// Large joints
		if ( name.match( /hip|shoulder|spine|neck/i ) ) {

			return baseRadius * 1.5;

		}

		// Medium joints
		if ( name.match( /knee|elbow/i ) ) {

			return baseRadius * 1.2;

		}

		// Small joints
		return baseRadius;

	}

	/**
	 * Update bone display (call each frame if bones animate)
	 */
	update() {

		// Bones are attached to skeleton, so they update automatically!
		// This method is here for future enhancements (constraint arc updates, etc.)

	}

	/**
	 * Show/hide bones
	 */
	setVisible( visible ) {

		this.visible = visible;

	}

	/**
	 * Dispose of geometry and materials
	 */
	dispose() {

		this.traverse( ( child ) => {

			if ( child.geometry ) child.geometry.dispose();
			if ( child.material ) child.material.dispose();

		} );

	}

}

export default OctahedralBoneHelper;
