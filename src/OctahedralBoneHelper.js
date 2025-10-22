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
 * @version 1.0.1 - Fixed scaling math for seamless bone connections
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
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
			modelPath: options.modelPath || '../models/octahedralBoneZup.glb',
			
			// CRITICAL: Actual geometry measurements from Blender model (in meters)
			octahedronTipDistance: options.octahedronTipDistance || 2.30045, // Distance from origin to tip (meters)
			sphereTemplateRadius: options.sphereTemplateRadius || 0.238,     // Template sphere radius (meters)
			
			...options
		};

		this.boneObjects = [];
		this.jointSpheres = [];
		this.constraintArcs = [];

		// Template geometries (loaded from GLB)
		this.boneTemplate = null;
		this.sphereTemplate = null;
		this.isReady = false;

		// Load the GLB model, then create bones
		this._loadBoneModel().then( () => {

			this._createBones();
			this.isReady = true;

		} );

	}

	/**
	 * Load the octahedral bone GLB model
	 * @private
	 */
	async _loadBoneModel() {

		const loader = new GLTFLoader();

		return new Promise( ( resolve, reject ) => {

			loader.load(
				this.options.modelPath,
				( gltf ) => {

					// Extract the bone and sphere meshes from the GLB
					gltf.scene.traverse( ( child ) => {

						if ( child.isMesh ) {

							if ( child.name === 'OctahedralBone' ) {

								this.boneTemplate = child.geometry.clone();

							} else if ( child.name === 'JointSphere' ) {

								this.sphereTemplate = child.geometry.clone();

							}

						}

					} );

					if ( ! this.boneTemplate || ! this.sphereTemplate ) {

						console.warn( 'OctahedralBoneHelper: Could not find OctahedralBone or JointSphere in GLB, using procedural geometry' );
						this._createFallbackGeometry();

					}

					resolve();

				},
				undefined,
				( error ) => {

					console.error( 'OctahedralBoneHelper: Error loading bone model, using procedural geometry', error );
					this._createFallbackGeometry();
					resolve(); // Resolve anyway with fallback

				}
			);

		} );

	}

	/**
	 * Create fallback procedural geometry if GLB fails to load
	 * @private
	 */
	_createFallbackGeometry() {

		// Use the existing _createTaperedOctahedron method
		this.boneTemplate = this._createTaperedOctahedron( this.options.octahedronTipDistance );

		// Simple sphere for joint
		this.sphereTemplate = new SphereGeometry( this.options.sphereTemplateRadius, 16, 16 );

	}

	/**
	 * Create octahedral bones for entire skeleton
	 * @private
	 */
	_createBones() {

		for ( let i = 0; i < this.bones.length; i ++ ) {

			const bone = this.bones[ i ];
			const childBones = this._findAllChildBones( bone );

			if ( childBones.length === 0 ) {

				// End effector - create small sphere
				this._createEndEffectorSphere( bone );
				continue;

			}

			// Create a bone visualization for EACH child (handles pelvis, clavicles, etc.)
			for ( const childBone of childBones ) {

				// Create directional octahedron
				const octahedron = this._createOctahedralBone( bone, childBone );
				this.boneObjects.push( octahedron );

				// Create joint spheres (head and tail)
				const jointSphere = this._createJointSphere( bone, childBone );
				this.jointSpheres.push( jointSphere );

			}

		}

	}

	/**
	 * Create Blender-style bone geometry (FALLBACK ONLY)
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
	 * FIXED: Proper scaling so tip reaches child position exactly
	 * @private
	 */
	_createOctahedralBone( bone, childBone ) {

		if ( ! this.boneTemplate ) {

			console.warn( 'OctahedralBoneHelper: Bone template not loaded yet' );
			return null;

		}

		// Get bone direction and length
		const childLocalPos = childBone.position.clone();
		const boneLength = childLocalPos.length();
		const boneDirection = childLocalPos.clone().normalize();

		// Clone the template geometry
		const geometry = this.boneTemplate.clone();

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

		// FIX: Scale bone to make tip reach child exactly
		// Template has tip at distance = octahedronTipDistance from origin
		// We need tip to reach boneLength distance
		const scaleFactor = boneLength / this.options.octahedronTipDistance;
		octahedron.scale.set( scaleFactor, scaleFactor, scaleFactor );

		// Rotate octahedron to point toward child bone
		// Template is aligned to +Y axis from Blender
		const targetDir = boneDirection.clone();
		const currentDir = new Vector3( 0, 1, 0 );

		// Debug logging
		console.log( `Creating bone for ${bone.name}:` );
		console.log( `  Child position (local): (${childLocalPos.x.toFixed( 3 )}, ${childLocalPos.y.toFixed( 3 )}, ${childLocalPos.z.toFixed( 3 )})` );
		console.log( `  Bone length: ${boneLength.toFixed( 3 )}` );
		console.log( `  Target direction: (${targetDir.x.toFixed( 3 )}, ${targetDir.y.toFixed( 3 )}, ${targetDir.z.toFixed( 3 )})` );

		const rotationAxis = new Vector3().crossVectors( currentDir, targetDir ).normalize();
		const rotationAngle = currentDir.angleTo( targetDir );

		console.log( `  Rotation axis: (${rotationAxis.x.toFixed( 3 )}, ${rotationAxis.y.toFixed( 3 )}, ${rotationAxis.z.toFixed( 3 )})` );
		console.log( `  Rotation angle: ${( rotationAngle * 180 / Math.PI ).toFixed( 1 )}°` );

		if ( rotationAxis.length() > 0.001 ) {

			octahedron.quaternion.setFromAxisAngle( rotationAxis, rotationAngle );
			console.log( `  Quaternion set: (${octahedron.quaternion.x.toFixed( 3 )}, ${octahedron.quaternion.y.toFixed( 3 )}, ${octahedron.quaternion.z.toFixed( 3 )}, ${octahedron.quaternion.w.toFixed( 3 )})` );

		} else {

			console.log( `  No rotation needed (already aligned to +Y)` );

		}

		// Attach to bone's transform at origin
		bone.add( octahedron );

		return octahedron;

	}

	/**
	 * Create joint spheres at bone head and tail (Blender style)
	 * FIXED: Proper sphere scaling based on template radius
	 * @private
	 */
	_createJointSphere( bone, childBone ) {

		if ( ! this.sphereTemplate ) {

			console.warn( 'OctahedralBoneHelper: Sphere template not loaded yet' );
			return null;

		}

		// Joint sphere colored by joint TYPE (red=knee, blue=hip, etc.)
		const jointType = this._detectJointType( bone );
		const color = this._getColorForJointType( jointType );

		if ( ! childBone ) {

			// End effector - single sphere at bone head
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

		const boneLength = childBone.position.length();

		const material = new MeshPhongMaterial( {
			color: color,
			shininess: 30,
			specular: 0x222222,
			transparent: false,
			depthTest: false,
			depthWrite: false,
			side: 2
		} );

		// FIX: Proper sphere scaling
		// We want sphere radius = 15% of bone length
		// Template sphere has radius = sphereTemplateRadius
		// So scale = desiredRadius / templateRadius
		const desiredRadius = boneLength * 0.15; // 15% of bone length
		const sphereScale = desiredRadius / this.options.sphereTemplateRadius;

		// HEAD SPHERE (at bone origin - where it connects to parent)
		// Only create head sphere for first child to avoid duplicates
		const allChildren = this._findAllChildBones( bone );
		const isFirstChild = allChildren.indexOf( childBone ) === 0;

		if ( isFirstChild ) {

			const headSphere = new Mesh( this.sphereTemplate.clone(), material );
			headSphere.renderOrder = 999;
			headSphere.scale.set( sphereScale, sphereScale, sphereScale );
			headSphere.position.set( 0, 0, 0 ); // At bone head
			bone.add( headSphere );

		}

		// TAIL SPHERE (at child position - where child bone will connect)
		const tailSphere = new Mesh( this.sphereTemplate.clone(), material );
		tailSphere.renderOrder = 999;
		tailSphere.scale.set( sphereScale, sphereScale, sphereScale );
		tailSphere.position.copy( childBone.position ); // At bone tail
		bone.add( tailSphere );

		// Return tail sphere for tracking
		return tailSphere;

	}

	/**
	 * Create visualization for end effectors (hands, feet, fingertips)
	 * Creates a small directional bone extending from parent
	 * @private
	 */
	_createEndEffectorSphere( bone ) {

		if ( ! this.boneTemplate || ! this.sphereTemplate ) {

			// Fallback to simple sphere if templates not loaded
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

		// Determine color by joint type
		const jointType = this._detectJointType( bone );
		const color = this._getColorForJointType( jointType );

		// Estimate end effector length (10% of parent bone length, or default 0.1)
		let endEffectorLength = 0.1; // Default for heads, etc.

		if ( bone.parent && bone.parent.isBone ) {

			// Find our position relative to parent
			const ourLength = bone.position.length();
			endEffectorLength = ourLength * 0.3; // 30% of parent bone length

		}

		// Create small octahedral bone extending from this bone
		const geometry = this.boneTemplate.clone();
		const material = new MeshPhongMaterial( {
			color: color,
			shininess: 30,
			specular: 0x222222,
			flatShading: true,
			transparent: false,
			depthTest: false,
			depthWrite: false,
			side: 2
		} );

		const scaleFactor = endEffectorLength / this.options.octahedronTipDistance;
		const octahedron = new Mesh( geometry, material );
		octahedron.renderOrder = 999;
		octahedron.scale.set( scaleFactor, scaleFactor, scaleFactor );
		bone.add( octahedron );

		// Add sphere at base
		const desiredRadius = endEffectorLength * 0.15;
		const sphereScale = desiredRadius / this.options.sphereTemplateRadius;
		const headSphere = new Mesh( this.sphereTemplate.clone(), material );
		headSphere.renderOrder = 999;
		headSphere.scale.set( sphereScale, sphereScale, sphereScale );
		headSphere.position.set( 0, 0, 0 );
		bone.add( headSphere );

		return octahedron;

	}

	/**
	 * Find ALL child bones (handles multi-child cases like pelvis)
	 * @private
	 */
	_findAllChildBones( bone ) {

		const children = [];

		for ( const child of bone.children ) {

			if ( child.isBone ) {

				children.push( child );

			}

		}

		return children;

	}

	/**
	 * Find first child bone (legacy - kept for compatibility)
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
