/**
 * LeafBoneCreator.js
 * Creates extension bones past end joints for IK leverage and orientation control
 *
 * Implements industry-standard "leaf bone" concept from Blender/Maya:
 * - Extends 10-30% past end effectors
 * - Provides leverage for natural orientation control
 * - Enables ankle/wrist rotation via IK target positioning
 *
 * Copyright © 2025 Allen Partridge (p0qp0q / Black Box Studios)
 * Licensed under the MIT License
 *
 * @author Allen Partridge <p0qp0q@poqpoq.com>
 * @version 1.0.0
 */

import { Bone, Vector3, Matrix4 } from 'three';
import { BoneAxisDetector } from './BoneAxisDetector.js';

/**
 * LeafBoneCreator - Automatic leaf bone generation for IK chains
 *
 * Creates small extension bones past end joints (hands, feet, etc.)
 * to provide leverage for natural orientation control.
 *
 * Based on Blender/Maya automatic leaf bone generation.
 */
export class LeafBoneCreator {

	constructor( options = {} ) {

		this.axisDetector = new BoneAxisDetector();

		// Configuration
		this.options = {
			defaultLeafLength: options.defaultLeafLength || 0.1,  // 10cm fallback
			leafLengthRatio: options.leafLengthRatio || 0.15,     // 15% of parent bone
			minLeafLength: options.minLeafLength || 0.05,         // Minimum 5cm
			maxLeafLength: options.maxLeafLength || 0.3,          // Maximum 30cm
			nameSuffix: options.nameSuffix || '_End',             // Naming convention
			excludePatterns: options.excludePatterns || [ 'IK_Target', 'Helper', '_end', 'end_' ],
			logCreation: options.logCreation !== false            // Console logging
		};

	}

	/**
	 * Create leaf bones for all suitable end joints
	 *
	 * @param {THREE.Skeleton} skeleton - The skeleton to enhance
	 * @return {Array} Array of leaf bone info objects
	 */
	createLeafBones( skeleton ) {

		if ( ! skeleton || ! skeleton.bones || skeleton.bones.length === 0 ) {

			console.error( 'LeafBoneCreator: Invalid skeleton provided' );
			return [];

		}

		const leafBones = [];
		const endJoints = this.findEndJoints( skeleton );

		if ( this.options.logCreation ) {

			console.log( `🌿 LeafBoneCreator: Found ${endJoints.length} end joints` );

		}

		endJoints.forEach( ( { bone, index } ) => {

			const leaf = this.createLeafForBone( bone, skeleton );

			if ( leaf ) {

				// Add to skeleton bones array
				const leafIndex = skeleton.bones.length;
				skeleton.bones.push( leaf );

				// Calculate and add inverse bind matrix
				const boneInverse = this.calculateBoneInverse( leaf );
				skeleton.boneInverses.push( boneInverse );

				leafBones.push( {
					leaf: leaf,
					parent: bone,
					parentIndex: index,
					leafIndex: leafIndex,
					length: leaf.position.length()
				} );

				if ( this.options.logCreation ) {

					console.log( `  ✅ Created leaf: ${leaf.name} (${leaf.position.length().toFixed( 3 )}m from ${bone.name})` );

				}

			}

		} );

		// Update skeleton with new bones
		skeleton.update();

		if ( this.options.logCreation ) {

			console.log( `🌿 LeafBoneCreator: Created ${leafBones.length} leaf bones` );

		}

		return leafBones;

	}

	/**
	 * Find all end joints (bones with no children) suitable for leaf bones
	 *
	 * @param {THREE.Skeleton} skeleton
	 * @return {Array} Array of {bone, index}
	 */
	findEndJoints( skeleton ) {

		const endJoints = [];
		const bones = skeleton.bones;

		bones.forEach( ( bone, index ) => {

			// Skip if bone name matches exclusion patterns
			const excluded = this.options.excludePatterns.some( pattern =>
				bone.name.includes( pattern )
			);

			if ( excluded ) return;

			// Check if bone has children
			const hasChildren = bones.some( b => b.parent === bone );

			// End joint = has parent but no children
			if ( ! hasChildren && bone.parent && bone.parent.isBone ) {

				endJoints.push( { bone, index } );

			}

		} );

		return endJoints;

	}

	/**
	 * Create a leaf bone for given end joint
	 *
	 * @param {THREE.Bone} bone - The end joint to extend
	 * @param {THREE.Skeleton} skeleton - Full skeleton (for axis detection)
	 * @return {THREE.Bone} The created leaf bone
	 */
	createLeafForBone( bone, skeleton ) {

		// Detect bone's primary axis using BoneAxisDetector
		const axisInfo = this.axisDetector.detectPrimaryAxis( bone );

		// Create direction vector based on detected axis
		const direction = new Vector3();

		switch ( axisInfo.axis.toLowerCase() ) {

			case 'x':
				direction.set( axisInfo.directionSign || 1, 0, 0 );
				break;

			case 'y':
				direction.set( 0, axisInfo.directionSign || 1, 0 );
				break;

			case 'z':
				direction.set( 0, 0, axisInfo.directionSign || 1 );
				break;

			default:
				console.warn( `LeafBoneCreator: Unknown axis ${axisInfo.axis} for ${bone.name}, using Y` );
				direction.set( 0, 1, 0 );

		}

		// Calculate leaf length
		const parentLength = bone.position.length();
		let leafLength;

		if ( parentLength > 0.001 ) {

			// Use ratio of parent bone length
			leafLength = parentLength * this.options.leafLengthRatio;

		} else {

			// Fallback for bones at origin
			leafLength = this.options.defaultLeafLength;

		}

		// Clamp to min/max
		leafLength = Math.max( this.options.minLeafLength, leafLength );
		leafLength = Math.min( this.options.maxLeafLength, leafLength );

		// Create leaf bone
		const leafBone = new Bone();
		leafBone.name = bone.name + this.options.nameSuffix;

		// Position in local space (relative to parent bone)
		leafBone.position.copy( direction.multiplyScalar( leafLength ) );

		// Parent to end joint
		bone.add( leafBone );

		// Initialize matrices
		leafBone.updateMatrix();
		leafBone.updateMatrixWorld( true );

		return leafBone;

	}

	/**
	 * Calculate inverse bind matrix for leaf bone
	 *
	 * @param {THREE.Bone} leafBone
	 * @return {THREE.Matrix4} Inverse bind matrix
	 */
	calculateBoneInverse( leafBone ) {

		// Ensure world matrix is up to date
		leafBone.updateMatrixWorld( true );

		// Inverse bind matrix = inverse of bind pose world transform
		const boneInverse = new Matrix4();
		boneInverse.copy( leafBone.matrixWorld ).invert();

		return boneInverse;

	}

	/**
	 * Update IK chains to use leaf bones as effectors
	 *
	 * @param {Array} ikChains - Array of IK chain configurations
	 * @param {Array} leafBones - Array of leaf bone info from createLeafBones()
	 * @param {THREE.Skeleton} skeleton - The skeleton
	 * @return {Object} { chainsUpdated, chainsUnchanged }
	 */
	updateIKChainsWithLeaves( ikChains, leafBones, skeleton ) {

		let chainsUpdated = 0;
		let chainsUnchanged = 0;

		ikChains.forEach( chain => {

			const currentEffector = skeleton.bones[ chain.effector ];

			if ( ! currentEffector ) {

				console.warn( `LeafBoneCreator: Chain has invalid effector index ${chain.effector}` );
				chainsUnchanged ++;
				return;

			}

			// Find if this effector has a leaf bone
			const leafInfo = leafBones.find( l => l.parent === currentEffector );

			if ( leafInfo ) {

				// Add original effector to links (if not already there)
				const effectorInLinks = chain.links.some( link => link.index === leafInfo.parentIndex );

				if ( ! effectorInLinks ) {

					// Add parent (original end joint) to chain links
					chain.links.push( {
						index: leafInfo.parentIndex,
						limitation: undefined,  // Or copy from metadata if available
						rotationMin: new Vector3( - Math.PI, - Math.PI, - Math.PI ),
						rotationMax: new Vector3( Math.PI, Math.PI, Math.PI )
					} );

				}

				// Update effector to leaf
				const oldEffectorName = currentEffector.name;
				chain.effector = leafInfo.leafIndex;

				if ( this.options.logCreation ) {

					console.log( `  🔄 Updated chain: ${oldEffectorName} → ${leafInfo.leaf.name}` );

				}

				chainsUpdated ++;

			} else {

				chainsUnchanged ++;

			}

		} );

		return {
			chainsUpdated,
			chainsUnchanged,
			totalChains: ikChains.length
		};

	}

}
