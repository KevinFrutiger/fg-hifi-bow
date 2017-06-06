// Utilities
function conditionalPrint() {
  var shouldPrint = true;

  return function(message) {
    if(shouldPrint) {
      print(message);
      shouldPrint = false;
    }
  }
}

var printOnce = conditionalPrint();

function printCache() {
  var lastMessage = '';

  return function(message) {
    if (message != lastMessage) {
      print(message);
      lastMessage = message;
    }
  }
}

var printIfChanged = printCache();

//

(function() {

  print('this is the bow function body');

  //Script.include("/~/system/libraries/utils.js");

  const ARROW_SHELF_SOUND_URL = Script.resolvePath('sound/notch.wav');
  const SHOOT_ARROW_SOUND_URL = Script.resolvePath('sound/String_release2.L.wav');
  const BOWSTRING_PULL_SOUND_URL = Script.resolvePath('sound/Bow_draw.1.L.wav');
  const ARROW_HIT_SOUND_URL = Script.resolvePath('sound/Arrow_impact1.L.wav');

  const BOWSTRING_NAME = 'HiFi-Bowstring';
  const DRAW_BOWSTRING_THRESHOLD = 0.80;
  const NEAR_TO_RELAXED_SHELF_DISTANCE = 0.45;
  const ARROW_SHELF_OFFSET_FORWARD = 0.08;
  const ARROW_SHELF_OFFSET_UP = 0.035;
  const ARROW_SHELF_OFFSET_RIGHT = -0.010;
  const BOWSTRING_DRAW_DELTA_FOR_HAPTIC_PULSE = 0.045; // lower number = faster pulse
  const BOWSTRING_MAX_DRAW = 0.7;
  const TOP_NOCK_POSITION = { // Local to the bowstring
    x: 0,
    y: 0,
    z: 0
  }
  const BOTTOM_NOCK_POSITION = {
    x: 0,
    y: -1.2,
    z: 0
  }

  const ARROW_NAME = 'HiFi-Arrow';
  const ARROW_MODEL_URL = Script.resolvePath('arrow.fbx');
  const ARROW_PARTICLE_NAME = 'HiFi-Arrow-Particles';
  const ARROW_PARTICLE_URL = Script.resolvePath('arrow-sparkle.png');
  const ARROW_TIP_OFFSET = 0.47; // Distance from origin of arrow to tip of the arrowhead.
  const ARROW_DIMENSIONS = {
    x: 0.1,
    y: 0.1,
    z: 0.93
  }
  const ARROW_GRAVITY = {
    x: 0,
    y: -9.8,
    z: 0
  };
  const ARROW_LIFETIME = 15.0; // seconds
  const ARROW_PARTICLE_LIFESPAN = 2.0; // seconds
  const MIN_ARROW_DISTANCE_FROM_BOW_REST = 0.2;
  const MAX_ARROW_DISTANCE_FROM_BOW_REST = ARROW_DIMENSIONS.z - 0.2;
  const MIN_ARROW_DISTANCE_FROM_BOW_REST_TO_SHOOT = 0.2;
  const MIN_ARROW_SPEED = 3;
  const MAX_ARROW_SPEED = 30;

  // Null ID used to reset the parent property of an entity (i.e. unparent it).
  const NULL_UUID = '{00000000-0000-0000-0000-000000000000}';

  const TRIGGER_CONTROLS = [
    Controller.Standard.LT,
    Controller.Standard.RT,
  ];

  const STATE_IDLE = 0;
  const STATE_ARROW_GRABBED = 1;



  var testEntityID = null; // Just an entity used for seeing positions, etc

  function Bow() {
    print('Bow constructor');
  }

  Bow.prototype.state = STATE_IDLE;
  Bow.prototype.arrowID = null; // The arrow entity
  Bow.prototype.backHandBusy = false;
  Bow.prototype.pullBackDistance = 0;

  Bow.prototype.preload = function(entityID) {
    print('Bow preload');
    this.entityID = entityID;
    this.createBowstring();

    this.arrowShelfSound = SoundCache.getSound(ARROW_SHELF_SOUND_URL);
    this.shootArrowSound = SoundCache.getSound(SHOOT_ARROW_SOUND_URL);
    this.bowstringPullSound = SoundCache.getSound(BOWSTRING_PULL_SOUND_URL);
    this.arrowHitSound = SoundCache.getSound(ARROW_HIT_SOUND_URL);
  };

  Bow.prototype.startEquip = function(entityID, args) { // args is [joint name, jointid]
    print('startEquip', entityID, args);

    // Store which hand is on the bow and which will interact with the bowstring
    this.bowHand = args[0];
    this.bowstringHand = (this.bowHand === 'left') ? 'right' : 'left';

    // Toggle the grabbable key, so no-one else can grab the bow (including you with your other hand).
    var data = JSON.parse(Entities.getEntityProperties(entityID).userData);
    data.grabbableKey.grabbable = false;
    Entities.editEntity(entityID, {userData: JSON.stringify(data)});

    // Stop bow from colliding with things
    Entities.editEntity(entityID, {
      collidesWith: ''
    });

    // Start the update loop.
    var self = this;
    this.updateIntervalID = Script.setInterval(function() { self.update(); }, 11);
  };

  Bow.prototype.releaseEquip = function(entityID, args) {

    // Stop the update loop.
    Script.clearInterval(this.updateIntervalID);
    this.updateIntervalID = null;

    print('releaseEquip', entityID, args)

    // Re-enable the bowstring hand.
    Messages.sendLocalMessage('Hifi-Hand-Disabler', 'none');

    // Make the bow grabbable by everyone (including yourself)
    var data = JSON.parse(Entities.getEntityProperties(entityID).userData);
    data.grabbableKey.grabbable = true;
    Entities.editEntity(entityID, {userData: JSON.stringify(data)});

    // Make bow collidable again with anything
    Entities.editEntity(entityID, {
        collidesWith: "static,dynamic,kinematic,otherAvatar,myAvatar"
    });
  };

  Bow.prototype.update = function() {
    // Get the float value of the trigger on the bowstring hand's controller.
    this.triggerValue = Controller.getValue(
        TRIGGER_CONTROLS[(this.bowstringHand === 'right') ? 1 : 0]);

    // Get the position and rotation of the bow.
    this.bowProperties = Entities.getEntityProperties(this.entityID,
                                                      ['position', 'rotation']);

    // Calc the arrow shelf's position.
    var arrowShelfPosition = this.getArrowShelfPosition(this.bowProperties);

    // TESTING ONLY
    // if (!testEntityID) {
    //   testEntityID = Entities.addEntity({
    //     type: 'Box',
    //     name: 'bow-test-cube',
    //     position: arrowShelfPosition,
    //     collisionless: true
    //   });
    // } else {
    //   Entities.editEntity(testEntityID, {position: arrowShelfPosition});
    // }
    // END TESTING ONLY

    var bowstringHandPosition =
            this.getControllerLocation(this.bowstringHand).position;
    var bowstringHandToArrowShelf =
            Vec3.subtract(arrowShelfPosition, bowstringHandPosition);
    var pullBackDistance = Vec3.length(bowstringHandToArrowShelf);

    printIfChanged('state is ' + this.state + ' ' + this.arrowID);

    if (this.state === STATE_IDLE) {

      this.pullBackDistance = 0;
      this.resetBowstringToIdle();

      if (this.triggerValue >= DRAW_BOWSTRING_THRESHOLD
          && pullBackDistance < NEAR_TO_RELAXED_SHELF_DISTANCE
          && !this.backHandBusy) {

        this.state = STATE_ARROW_GRABBED;

      }
    }

    if (this.state === STATE_ARROW_GRABBED) {
      if (!this.arrowID) {
        // Disable the auxilary hand functionality (grab laser pointer,
        // tablet stylus, etc.) for the hand that's grabbing the bowstring.
        Messages.sendLocalMessage('Hifi-Hand-Disabler', this.bowstringHand);

        this.playArrowShelfSound();

        // Rez the arrow.
        this.arrowID = this.createArrow();

        this.playBowstringPullSound();
      }

      if (this.triggerValue < DRAW_BOWSTRING_THRESHOLD) {

        if (pullBackDistance >= MIN_ARROW_DISTANCE_FROM_BOW_REST_TO_SHOOT) {
          // Shoot the arrow.

          // Re-enable the bowstring hand auxilary functions.
          Messages.sendLocalMessage('Hifi-Hand-Disabler', 'none');

          // Release the arrow.
          this.updateArrowOnShelf(true, true);
        } else {
          // Discard the arrow.

          // Re-enable the bowstring hand auxilary functions.
          Messages.sendLocalMessage('Hifi-Hand-Disabler', 'none');

          Entities.deleteEntity(this.arrowID);
        }

        this.arrowID = null;
        this.state = STATE_IDLE;
        this.resetBowstringToIdle();

      } else {

        this.updateArrowOnShelf(false, true);
        this.updateBowstring();

      }
    }

  };

  Bow.prototype.createBowstring = function() {
    this.bowstringID = Entities.addEntity({
      type: 'Line',
      name: BOWSTRING_NAME,
      parentID: this.entityID,
      collisionless: true,
      ignoreForCollisions: 1,
      dimensions: { x: 5, y: 5, z: 5 }, // Has to be here for string to show. Not sure why it's 5 x 5 x 5. 1 x 1 x 1 doesn't work.
      linePoints: [ { x: 0, y: 0, z: 0 }, { x: 0, y: -1.2, z: 0 } ],
      lineWidth: 10,
      color: { red: 153, green: 102, blue: 51 },
      localPosition: { x: 0, y: 0.6, z: 0.1 }, // Not documented, but needed to put in correct position.
      localRotation: { w: 1, x: 0, y: 0, z: 0 }, // Not documented. Doesn't seem to have any affect.
      userData: JSON.stringify({
        grabbableKey: {
          grabbable: false
        }
      })
    });
  };

  Bow.prototype.resetBowstringToIdle = function() {
    Entities.editEntity(this.bowstringID, {
      linePoints: [TOP_NOCK_POSITION, BOTTOM_NOCK_POSITION],
      lineWidth: 10,
      localPosition: {x: 0, y: 0.6, z: 0.1 },
      localRotation: {w: 1, x: 0, y: 0, z: 0 },
    });
  };

  Bow.prototype.updateBowstring = function() {
    // Calc the position of the arrow nock.
    var bowstringProps = Entities.getEntityProperties(this.bowstringID,
                                                      ['position', 'rotation']);
    var arrowNockPositionLocal =
            Vec3.subtract(this.arrowRearPosition, bowstringProps.position);
    // Rotate the vector to align with the bow. (multiply Quat by Vec3)
    arrowNockPositionLocal =
            Vec3.multiplyQbyV(Quat.inverse(bowstringProps.rotation),
                              arrowNockPositionLocal);

    // Update the bowstring line.
    Entities.editEntity(this.bowstringID, {
      linePoints: [
        TOP_NOCK_POSITION,
        arrowNockPositionLocal,
        BOTTOM_NOCK_POSITION,
      ]
    });
  };

  Bow.prototype.createArrow = function() {

    var arrowID = Entities.addEntity({
      name: ARROW_NAME,
      type: 'Model',
      modelURL: ARROW_MODEL_URL,
      shapeType: 'simple-compound',
      dimensions: ARROW_DIMENSIONS,
      position: this.bowProperties.position,
      parentID: this.entityID,
      dynamic: false,
      collisionless: true,
      damping: 0.01,
      userData: JSON.stringify({
        grabbableKey: {
          grabbable: false
        },
        createrSessionUUID: MyAvatar.sessionUUID
      })
    });

    // TODO: make arrow stick

    return arrowID;

  };

  Bow.prototype.updateArrowOnShelf = function(shouldRelease, shouldPulseHaptics) {
    var arrowShelfPosition = this.getArrowShelfPosition(this.bowProperties);
    var bowstringHandPosition =
            this.getControllerLocation(this.bowstringHand).position;
    var bowstringHandToArrowShelf =
            Vec3.subtract(arrowShelfPosition, bowstringHandPosition);
    var arrowRotation =
            Quat.rotationBetween(Vec3.FRONT, bowstringHandToArrowShelf);

    var handHapticIndex = (this.bowstringHand === 'left') ? 0 : 1;
    var pullBackDistance = Vec3.length(bowstringHandToArrowShelf);

    // Pulse the controller if the change from last update is above the threshold.
    if (shouldPulseHaptics &&
        Math.abs(pullBackDistance - this.pullBackDistance) >
            BOWSTRING_DRAW_DELTA_FOR_HAPTIC_PULSE) {

        Controller.triggerHapticPulse(1, 20, handHapticIndex);
        this.pullBackDistance = pullBackDistance;
    }

    // Cap the distance you can draw back the bowstring.
    pullBackDistance = Math.min(BOWSTRING_MAX_DRAW, pullBackDistance);

    var handToShelfDistance = Vec3.length(bowstringHandToArrowShelf);
    var bowstringToShelfDistance =
            Math.max(MIN_ARROW_DISTANCE_FROM_BOW_REST,
                Math.min(MAX_ARROW_DISTANCE_FROM_BOW_REST, handToShelfDistance));
    var arrowPosition = Vec3.subtract(arrowShelfPosition, Vec3.multiply(Vec3.normalize(bowstringHandToArrowShelf), bowstringToShelfDistance - ARROW_DIMENSIONS.z / 2.0));

    var frontVector = Quat.getFront(arrowRotation);
    var frontOffset = Vec3.multiply(frontVector, -ARROW_TIP_OFFSET);
    var arrowRearPosition = Vec3.sum(arrowPosition, frontOffset);
    this.arrowRearPosition = arrowRearPosition;

    if (!shouldRelease) { // Aim the arrow.
      Entities.editEntity(this.arrowID, {
        position: arrowPosition,
        rotation: arrowRotation
      });
    } else { // Shoot the arrow.
      var arrowAge = Entities.getEntityProperties(this.arrowID, ['age']).age;

      // Scale the shot strength by the bowstring draw distance.
      var arrowForce = this.scaleArrowShotStrength(bowstringToShelfDistance);

      // Calc the velocity
      var handToShelfNorm = Vec3.normalize(bowstringHandToArrowShelf);
      var releaseVelocity = Vec3.multiply(handToShelfNorm, arrowForce);

      var arrowParticleProperties = {
        type: 'ParticleEffect',
        name: ARROW_PARTICLE_NAME,
        parentID: this.arrowID,
        alphaStart: 0.3,
        alphaFinish: 0,
        azimuthStart: -3.14159,
        azimuthFinish: 3.1,
        emitAcceleration: { x: 0, y: 0, z: 0 },
        emitOrientation: { x: -0.7, y: 0.0, z: 0.0, w: 0.7 },
        emitRate: 0.01,
        emitSpeed: 0,
        lifespan: ARROW_PARTICLE_LIFESPAN,
        lifetime: ARROW_PARTICLE_LIFESPAN + 1,
        particleRadius: 0.132,
        radiusStart: 0.132,
        radiusFinish: 0.35,
        speedSpread: 0,
        textures: ARROW_PARTICLE_URL
      };

      // Add particles.
      Entities.addEntity(arrowParticleProperties);

      // Unparent the arrow and launch it (by giving it a velocity).
      Entities.editEntity(this.arrowID, {
        dynamic: true,
        collisionless: false,
        collidesWith: 'static,dynamic,otherAvatar',
        velocity: releaseVelocity,
        parentID: NULL_UUID,
        gravity: ARROW_GRAVITY,
        lifetime: arrowAge + ARROW_LIFETIME
      });

      this.playShootArrowSound();

      // Cause the arrow to orient itself along the trajectoy, i.e. be nose
      // heavy.
      Entities.addAction('travel-oriented', this.arrowID, {
        forward: {x: 0, y: 0, z: -1},
        angularTimeScale: 0.1, // How quickly it adjusts to change in trajectory.
        tag: 'Arrow from HiFi-bow',
        ttl: ARROW_LIFETIME
      });
    }

  }

  Bow.prototype.scaleArrowShotStrength = function(drawDistance) {
    // Scale the shot strength to the portion of the available draw distance used.
    var pct = (drawDistance - MIN_ARROW_DISTANCE_FROM_BOW_REST) /
              (MAX_ARROW_DISTANCE_FROM_BOW_REST - MIN_ARROW_DISTANCE_FROM_BOW_REST);
    return MIN_ARROW_SPEED + (pct * (MAX_ARROW_SPEED - MIN_ARROW_SPEED));
  }

  Bow.prototype.getArrowShelfPosition = function(bowProperties) {
    // Get the forward offset vector
    var frontVector = Quat.getFront(bowProperties.rotation);
    var arrowShelfVectorForward = Vec3.multiply(frontVector, ARROW_SHELF_OFFSET_FORWARD);

    // Get the up offset vector
    var upVector = Quat.getUp(bowProperties.rotation);
    var arrowShelfVectorUp = Vec3.multiply(upVector, ARROW_SHELF_OFFSET_UP);

    // Get the left offset vector
    var rightVector = Quat.getRight(bowProperties.rotation);
    var arrowShelfVectorLeft = Vec3.multiply(rightVector, ARROW_SHELF_OFFSET_RIGHT);

    // Sum the three offset directions to get the final position.
    var arrowShelfPosition = Vec3.sum(bowProperties.position, arrowShelfVectorForward);
    arrowShelfPosition = Vec3.sum(arrowShelfPosition, arrowShelfVectorUp);
    arrowShelfPosition = Vec3.sum(arrowShelfPosition, arrowShelfVectorLeft);

    return arrowShelfPosition;
  };

  Bow.prototype.getControllerLocation = function(controllerHand) {
    var standardControllerValue =
        (controllerHand === "right") ?
        Controller.Standard.RightHand :
        Controller.Standard.LeftHand;
    return this.getControllerWorldLocation(standardControllerValue, true);
  }

  // controllerWorldLocation is where the controller would be, in-world, with an added offset
  Bow.prototype.getControllerWorldLocation = function (handController, shouldOffset) {
    var orientation;
    var position;
    var pose = Controller.getPoseValue(handController);
    var valid = pose.valid;
    var controllerJointIndex;
    if (pose.valid) {
        if (handController === Controller.Standard.RightHand) {
            controllerJointIndex = MyAvatar.getJointIndex("_CAMERA_RELATIVE_CONTROLLER_RIGHTHAND");
        } else {
            controllerJointIndex = MyAvatar.getJointIndex("_CAMERA_RELATIVE_CONTROLLER_LEFTHAND");
        }
        orientation = Quat.multiply(MyAvatar.orientation, MyAvatar.getAbsoluteJointRotationInObjectFrame(controllerJointIndex));
        position = Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation, MyAvatar.getAbsoluteJointTranslationInObjectFrame(controllerJointIndex)));

        // add to the real position so the grab-point is out in front of the hand, a bit
        if (shouldOffset) {
            var offset = this.getGrabPointSphereOffset(handController);
            position = Vec3.sum(position, Vec3.multiplyQbyV(orientation, offset));
        }

    } else if (!HMD.isHandControllerAvailable()) {
        // NOTE: keep this offset in sync with scripts/system/controllers/handControllerPointer.js:493
        var VERTICAL_HEAD_LASER_OFFSET = 0.1;
        position = Vec3.sum(Camera.position, Vec3.multiplyQbyV(Camera.orientation, {x: 0, y: VERTICAL_HEAD_LASER_OFFSET, z: 0}));
        orientation = Quat.multiply(Camera.orientation, Quat.angleAxis(-90, { x: 1, y: 0, z: 0 }));
        valid = true;
    }

    return {position: position,
            translation: position,
            orientation: orientation,
            rotation: orientation,
            valid: valid};
  };


  // TODO: review getGrabPointSphereOffset
  // this offset needs to match the one in libraries/display-plugins/src/display-plugins/hmd/HmdDisplayPlugin.cpp:378
  var GRAB_POINT_SPHERE_OFFSET = { x: 0.04, y: 0.13, z: 0.039 };  // x = upward, y = forward, z = lateral

  Bow.prototype.getGrabPointSphereOffset = function(handController) {
    if (handController === Controller.Standard.RightHand) {
        return GRAB_POINT_SPHERE_OFFSET;
    }
    return {
        x: GRAB_POINT_SPHERE_OFFSET.x * -1,
        y: GRAB_POINT_SPHERE_OFFSET.y,
        z: GRAB_POINT_SPHERE_OFFSET.z
    };
  };


  // Sound
  Bow.prototype.playArrowShelfSound = function() {
    Audio.playSound(this.arrowShelfSound, {
      volume: 0.15,
      position: this.bowProperties.position
    });
  }

  Bow.prototype.playBowstringPullSound = function() {
    Audio.playSound(this.bowstringPullSound, {
      volume: 0.15,
      position: this.bowProperties.position
    });
  }

  Bow.prototype.playShootArrowSound = function() {
    Audio.playSound(this.shootArrowSound, {
      volume: 0.15,
      position: this.bowProperties.position
    });
  }




  var bow = new Bow();

  // TODO: Subscribe to messaging on bow instance

  return bow;

});