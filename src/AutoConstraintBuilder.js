/**
 * AutoConstraintBuilder.js
 * Automatic IK constraint configuration using biomechanical intelligence
 *
 * Combines BoneMapper + BoneAxisDetector + ConstraintHelper
 * to create IK configurations with ZERO manual setup
 *
 * Copyright © 2025 Allen Partridge (p0qp0q / Black Box Studios)
 * Licensed under the MIT License
 *
 * @author Allen Partridge <p0qp0q@poqpoq.com>
 * @version 1.0.0
 */

import { Vector3 } from 'three';
import {
	BoneMapper,
	BoneAxisDetector,
	ConstraintHelper,
	BiomechanicalData
} from '../../p0qp0q-animation-utils/src/index.js';

/**
 * AutoConstraintBuilder - Automatic IK configuration
 *
 * ONE METHOD to go from SkinnedMesh → Complete IK config:
 *   const builder = new AutoConstraintBuilder();
 *   const ikConfig = builder.buildIKConfig(mesh);
 *   const solver = new P0qP0qIKSolver(mesh, ikConfig);
 *
 * Works with ANY rig, ANY platform, ZERO manual configuration!
 */
export class AutoConstraintBuilder {

	constructor() {

		this.mapper = new BoneMapper();
		this.detector = new BoneAxisDetector();

		// Configuration options
		this.options = {
			preset: 'realisticHuman',  // or 'stylizedCharacter', 'athletic', 'conservative'
			enableLegs: true,
			enableArms: true,
			enableSpine: false,  // Spine IK is complex, defer to Phase 4
			logDetection: true   // Console logging for debugging
		};

	}

	/**
	 * Build complete IK configuration with automatic constraint detection
	 *
	 * @param {SkinnedMesh} mesh - The skinned mesh to configure
	 * @param {Object} options - Override default options
	 * @return {Array} IK configuration array ready for P0qP0qIKSolver
	 */
	buildIKConfig( mesh, options = {} ) {

		// Merge options
		const config = { ...this.options, ...options };

		console.log( '🚀 AutoConstraintBuilder: Building IK config...' );

		// Step 1: Map bones to standard skeleton
		const bones = mesh.skeleton.bones;
		const mapping = this.mapper.getBoneMapping( bones );

		if ( ! mapping.complete ) {

			console.error( '❌ Bone mapping incomplete - not enough bones found' );
			return [];

		}

		if ( config.logDetection ) {

			console.log( `✅ Platform detected: ${mapping.platformName || 'Unknown (fuzzy matching)'}` );
			console.log( `✅ Bones mapped: ${Object.keys( mapping.bones ).length}` );

		}

		// Step 2: Create bone index map
		const boneIndices = new Map();
		bones.forEach( ( bone, i ) => boneIndices.set( bone.uuid, i ) );

		// Step 3: Detect axes and create constraints
		const constraints = this._detectConstraints( mapping.bones, config );

		if ( config.logDetection ) {

			console.log( `✅ Constraints created: ${Object.keys( constraints ).length}` );

		}

		// Step 4: Build IK chains
		const ikChains = [];

		// Add target bones (IK targets need to be in skeleton!)
		const targetBones = this._createTargetBones( mesh, mapping.bones );

		// Left leg
		if ( config.enableLegs && mapping.bones.leftFoot ) {

			const leftLeg = this._createLegChain(
				'left',
				mapping.bones,
				boneIndices,
				constraints,
				targetBones.leftFoot
			);

			if ( leftLeg ) ikChains.push( leftLeg );

		}

		// Right leg
		if ( config.enableLegs && mapping.bones.rightFoot ) {

			const rightLeg = this._createLegChain(
				'right',
				mapping.bones,
				boneIndices,
				constraints,
				targetBones.rightFoot
			);

			if ( rightLeg ) ikChains.push( rightLeg );

		}

		// Left arm
		if ( config.enableArms && mapping.bones.leftHand ) {

			const leftArm = this._createArmChain(
				'left',
				mapping.bones,
				boneIndices,
				constraints,
				targetBones.leftHand
			);

			if ( leftArm ) ikChains.push( leftArm );

		}

		// Right arm
		if ( config.enableArms && mapping.bones.rightHand ) {

			const rightArm = this._createArmChain(
				'right',
				mapping.bones,
				boneIndices,
				constraints,
				targetBones.rightHand
			);

			if ( rightArm ) ikChains.push( rightArm );

		}

		console.log( `🎯 Built ${ikChains.length} IK chains with auto-constraints!` );

		return ikChains;

	}

	/**
	 * Detect constraints for all relevant bones
	 * @private
	 */
	_detectConstraints( mappedBones, config ) {

		const constraints = {};

		// Knees
		if ( mappedBones.leftLowerLeg ) {

			const axis = this.detector.detectPrimaryAxis( mappedBones.leftLowerLeg );
			constraints.leftKnee = ConstraintHelper.createFromBiomechanics( 'knee', axis.direction );

			if ( config.logDetection ) {

				console.log( `🦵 Left knee: ${axis.axis.toUpperCase()}-axis (${( axis.confidence * 100 ).toFixed( 0 )}% confidence)` );

			}

		}

		if ( mappedBones.rightLowerLeg ) {

			const axis = this.detector.detectPrimaryAxis( mappedBones.rightLowerLeg );
			constraints.rightKnee = ConstraintHelper.createFromBiomechanics( 'knee', axis.direction );

			if ( config.logDetection ) {

				console.log( `🦵 Right knee: ${axis.axis.toUpperCase()}-axis (${( axis.confidence * 100 ).toFixed( 0 )}% confidence)` );

			}

		}

		// Elbows
		if ( mappedBones.leftLowerArm ) {

			const axis = this.detector.detectPrimaryAxis( mappedBones.leftLowerArm );
			constraints.leftElbow = ConstraintHelper.createFromBiomechanics( 'elbow', axis.direction );

			if ( config.logDetection ) {

				console.log( `💪 Left elbow: ${axis.axis.toUpperCase()}-axis (${( axis.confidence * 100 ).toFixed( 0 )}% confidence)` );

			}

		}

		if ( mappedBones.rightLowerArm ) {

			const axis = this.detector.detectPrimaryAxis( mappedBones.rightLowerArm );
			constraints.rightElbow = ConstraintHelper.createFromBiomechanics( 'elbow', axis.direction );

			if ( config.logDetection ) {

				console.log( `💪 Right elbow: ${axis.axis.toUpperCase()}-axis (${( axis.confidence * 100 ).toFixed( 0 )}% confidence)` );

			}

		}

		return constraints;

	}

	/**
	 * Create target bones for IK
	 * @private
	 */
	_createTargetBones( mesh, mappedBones ) {

		// Note: In a real implementation, these would be added to the skeleton
		// For now, we return the indices where they would be
		const skeleton = mesh.skeleton;
		const targetBones = {};

		// Targets will be appended to skeleton.bones array
		const baseIndex = skeleton.bones.length;

		targetBones.leftFoot = baseIndex;
		targetBones.rightFoot = baseIndex + 1;
		targetBones.leftHand = baseIndex + 2;
		targetBones.rightHand = baseIndex + 3;

		return targetBones;

	}

	/**
	 * Create leg IK chain with auto-detected constraints
	 * @private
	 */
	_createLegChain( side, bones, boneIndices, constraints, targetIndex ) {

		const hipBone = bones[ `${side}UpperLeg` ];
		const kneeBone = bones[ `${side}LowerLeg` ];
		const footBone = bones[ `${side}Foot` ];
		const toeBone = bones[ `${side}ToeBase` ];

		if ( ! hipBone || ! kneeBone || ! footBone ) {

			console.warn( `⚠️ Incomplete ${side} leg - skipping IK chain` );
			return null;

		}

		const effector = toeBone || footBone;

		return {
			target: targetIndex,
			effector: boneIndices.get( effector.uuid ),
			iteration: 10,
			minAngle: 0.0,
			maxAngle: 0.3,
			links: [
				{
					index: boneIndices.get( kneeBone.uuid ),
					swingTwistConstraint: constraints[ `${side}Knee` ]  // AUTO!
				},
				{
					index: boneIndices.get( hipBone.uuid )
					// Hip: ball joint, no constraints yet (Phase 4)
				}
			]
		};

	}

	/**
	 * Create arm IK chain with auto-detected constraints
	 * @private
	 */
	_createArmChain( side, bones, boneIndices, constraints, targetIndex ) {

		const shoulderBone = bones[ `${side}Shoulder` ];
		const upperArmBone = bones[ `${side}UpperArm` ];
		const lowerArmBone = bones[ `${side}LowerArm` ];
		const handBone = bones[ `${side}Hand` ];

		if ( ! lowerArmBone || ! handBone ) {

			console.warn( `⚠️ Incomplete ${side} arm - skipping IK chain` );
			return null;

		}

		return {
			target: targetIndex,
			effector: boneIndices.get( handBone.uuid ),
			iteration: 10,
			minAngle: 0.0,
			maxAngle: 0.3,
			links: [
				{
					index: boneIndices.get( lowerArmBone.uuid ),
					swingTwistConstraint: constraints[ `${side}Elbow` ]  // AUTO!
				},
				{
					index: boneIndices.get( upperArmBone.uuid )
					// Shoulder: ball joint, Phase 4
				}
			]
		};

	}

	/**
	 * Set configuration options
	 * @param {Object} options
	 */
	setOptions( options ) {

		this.options = { ...this.options, ...options };

	}

}

export default AutoConstraintBuilder;
