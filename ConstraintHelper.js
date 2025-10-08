/**
 * ConstraintHelper.js
 * Utilities for creating biomechanically accurate IK constraints
 * Integrates with BoneAxisDetector for universal rig support
 *
 * Copyright © 2025 Allen Partridge (p0qp0q / Black Box Studios)
 * Licensed under the MIT License
 *
 * @author Allen Partridge <p0qp0q@poqpoq.com>
 * @version 0.1.0
 */

import { Vector3, MathUtils } from 'three';

/**
 * Biomechanical constraint data for common joint types
 * Based on medical research and anatomical ROM studies
 */
export const BiomechanicalConstraints = {

	knee: {
		type: 'hinge',
		flexion: 130,      // Medical max: 135-150°, safe: 130°
		extension: 0,      // No hyperextension
		wiggle: 5,         // ±5° secondary axis freedom
		anatomicalMax: 150
	},

	elbow: {
		type: 'hinge',
		flexion: 140,      // Medical max: 145-150°, safe: 140°
		extension: 0,      // No hyperextension
		wiggle: 3,         // ±3° (more constrained than knee)
		anatomicalMax: 150
	},

	hip: {
		type: 'ball',
		flexion: 100,      // Knee to chest
		extension: 15,     // Leg behind body
		abduction: 40,     // Away from midline
		adduction: 25,     // Across midline
		rotation: 45       // Internal/external
	},

	shoulder: {
		type: 'ball',
		flexion: 170,      // Arm overhead forward
		extension: 50,     // Arm behind back
		abduction: 160,    // Arm overhead sideways
		adduction: 40,     // Arm across chest
		rotation: 80       // Internal/external
	},

	ankle: {
		type: 'universal',
		dorsiflexion: 20,  // Toes up
		plantarflexion: 45, // Point toes
		inversion: 25,     // Sole inward
		eversion: 15       // Sole outward
	},

	wrist: {
		type: 'universal',
		flexion: 80,       // Palm toward forearm
		extension: 70,     // Back of hand toward forearm
		radialDeviation: 20, // Thumb side up
		ulnarDeviation: 35   // Pinky side up
	}

};

/**
 * ConstraintHelper - Utilities for creating IK constraints
 * Integrates with BoneAxisDetector for automatic axis configuration
 */
export class ConstraintHelper {

	/**
	 * Create a hinge joint constraint (knee, elbow)
	 * @param {Vector3} twistAxis - Primary rotation axis (from BoneAxisDetector)
	 * @param {number} flexion - Max flexion in degrees
	 * @param {number} extension - Max extension in degrees (usually 0)
	 * @param {number} wiggle - Secondary axis wiggle in degrees
	 * @return {Object} Swing-twist constraint object
	 */
	static createHingeConstraint( twistAxis, flexion = 130, extension = 0, wiggle = 5 ) {

		return {
			type: 'hinge',
			twistAxis: twistAxis.clone().normalize(),
			twistMin: MathUtils.degToRad( -extension ),  // Negative = backward
			twistMax: MathUtils.degToRad( flexion ),     // Positive = forward
			swingRadius: MathUtils.degToRad( wiggle )
		};

	}

	/**
	 * Create a ball joint constraint (hip, shoulder)
	 * @param {Vector3} twistAxis - Primary rotation axis
	 * @param {number} twistRange - Rotation range in degrees (±)
	 * @param {number} swingRange - Swing cone radius in degrees
	 * @return {Object} Swing-twist constraint object
	 */
	static createBallConstraint( twistAxis, twistRange = 90, swingRange = 90 ) {

		return {
			type: 'ball',
			twistAxis: twistAxis.clone().normalize(),
			twistMin: MathUtils.degToRad( -twistRange ),
			twistMax: MathUtils.degToRad( twistRange ),
			swingRadius: MathUtils.degToRad( swingRange )
		};

	}

	/**
	 * Create constraint from biomechanical data and detected axis
	 * @param {string} jointName - 'knee', 'elbow', 'hip', etc.
	 * @param {Vector3} detectedAxis - From BoneAxisDetector.detectPrimaryAxis()
	 * @return {Object} Swing-twist constraint object
	 */
	static createFromBiomechanics( jointName, detectedAxis ) {

		const bioData = BiomechanicalConstraints[ jointName ];

		if ( ! bioData ) {

			console.warn( `No biomechanical data for joint: ${jointName}` );
			return null;

		}

		if ( bioData.type === 'hinge' ) {

			return this.createHingeConstraint(
				detectedAxis,
				bioData.flexion,
				bioData.extension,
				bioData.wiggle
			);

		} else if ( bioData.type === 'ball' ) {

			return this.createBallConstraint(
				detectedAxis,
				bioData.rotation,
				bioData.flexion
			);

		}

		return null;

	}

	/**
	 * Detect joint type from bone name
	 * @param {string} boneName - Bone name to analyze
	 * @return {string} 'knee', 'elbow', 'hip', 'shoulder', 'ankle', 'wrist', or null
	 */
	static detectJointType( boneName ) {

		const name = boneName.toLowerCase();

		// Hinge joints
		if ( name.match( /knee|shin|lowerleg|calf/i ) ) return 'knee';
		if ( name.match( /elbow|lowerarm|forearm/i ) ) return 'elbow';

		// Ball joints
		if ( name.match( /hip|thigh|upperleg/i ) ) return 'hip';
		if ( name.match( /shoulder|upperarm|clavicle/i ) ) return 'shoulder';

		// Universal joints
		if ( name.match( /ankle|foot/i ) ) return 'ankle';
		if ( name.match( /wrist|hand/i ) ) return 'wrist';

		return null;

	}

}

export default ConstraintHelper;
