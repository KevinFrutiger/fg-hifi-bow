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
  position: { // There's probably a Vec3 method that would be better. Base it off the front of the avatar?
    x: MyAvatar.position.x,
    y: MyAvatar.position.y + 2,
    z: MyAvatar.position.z + 2
  }, // Position is required. Otherwise it won't rez.
  //"rotation": Quat.fromPitchYawRollDegrees(0, 90, 0), // If entity spawns intersecting floor, it will fall through.
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