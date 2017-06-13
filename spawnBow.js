/**
 * spawnBow.js
 *
 * Created from Shortbow tutorial:
 * https://wiki.highfidelity.com/wiki/Shortbow_Tutorial
 *
 * Creates a bow entity and sets it up to be grabbable and wearable.
 *
 * This script not required if bow.js is attached directly to the bow entity
 * (i.e. imported model and attached that script). In that case, you'd need to
 * manually update the entity with any settings below.
 */

// Note that the currently the positions for the bow on the LeftHand and
// RightHand are customized to a specific avatar and may need to be adjusted
// to look correct on yours.

var userData = { // These keys are features in the API
  grabbableKey: {
    grabbable: true,
    ignoreIK: false, // Keeps bow from pushing away from hand at extremes.
  },
  wearable: { // keep on joint when trigger released
    joints: {
      LeftHand: [
        {x: -0.04, y: 0.02, z: 0.03}, // position
        Quat.fromPitchYawRollDegrees(90, -90, 0) // rotation
      ],
      RightHand: [
        {x: 0.04, y: 0.02, z: 0.03},
        Quat.fromPitchYawRollDegrees(90, 90, 0)
      ]
    }
  }
};

const CREATION_DATE = new Date();

// Create the bow
var id = Entities.addEntity({
  name: "Hifi-Bow",
  created: CREATION_DATE.toISOString(),
  type: "Model",
  modelURL: Script.resolvePath("bow-deadly.fbx"),
  script: Script.resolvePath("bow.js") + "?" + Date.now(),
  lifetime: 600, // In seconds. Other than -1 means it will eventually disappear
  // Position 1 meter in front of the user.
  position: Vec3.sum(MyAvatar.position, Quat.getFront(MyAvatar.orientation)),
  dimensions: { // Entity scaled to match and bounding box created
    x: 0.0400,
    y: 1.3000,
    z: 0.2000
  },
  gravity: {
    x: 0,
    y: -9.8,
    z: 0
  },
  collisionsWillMove: 1,
  shapeType: "compound",
  compoundShapeURL: Script.resolvePath("bow_collision_hull.obj"),
  dynamic: 1, // Will be moved by heavier objects
  userData: JSON.stringify(userData),
  velocity: {
    x: 0,
    y: -0.01, // Just so gravity has an effect
    z: 0
  }
});

print("Created bow:", id);