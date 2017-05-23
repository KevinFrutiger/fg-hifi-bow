(function() {

  print('this is the bow function body');

  //Script.include("/~/system/libraries/utils.js");

  const BOW_STRING_NAME = 'Hifi-Bow-String';
  const DRAW_BOW_STRING_THRESHOLD = 0.80;
  const NEAR_TO_RELAXED_NOCK_DISTANCE = 0.50;
  const ARROW_SHELF_OFFSET_FORWARD = 0.08;
  const ARROW_SHELF_OFFSET_UP = 0.035;

  const TRIGGER_CONTROLS = [
    Controller.Standard.LT,
    Controller.Standard.RT,
  ];

  const STATE_IDLE = 0;
  const STATE_ARROW_GRABBED = 1;

  var testEntityID = null; // Just an entity used for seeing positions, etc

  function Bow() {
    print('Bow constructor');

    this.pullBackDistance = 0;
    this.backHandBusy = false;
  }

  Bow.prototype.preload = function(entityID) {
    print('Bow preload');
    this.entityID = entityID;
    this.createBowString();
  };

  Bow.prototype.startEquip = function(entityID, args) { // args is [joint name, jointid], i think
    print('startEquip', entityID, args);

    this.bowHand = args[0];
    this.bowstringHand = (this.bowHand === 'left') ? 'right' : 'left';

    // Toggle the grabbable key, so no-one else can grab the bow (including you with your other hand).
    var data = JSON.parse(Entities.getEntityProperties(entityID).userData);
    data.grabbableKey.grabbable = false;
    Entities.editEntity(entityID, {userData: JSON.stringify(data)});

    // Stop entity from colliding with things
    Entities.editEntity(entityID, {
      collidesWith: ''
    });


    var self = this;
    this.updateIntervalID = Script.setInterval(function() { self.update(); }, 11);
  };

  Bow.prototype.releaseEquip = function(entityID, args) {
    Script.clearInterval(this.updateIntervalID);
    this.updateIntervalID = null;

    print('releaseEquip', entityID, args)

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
    // Get the float value of the trigger on the bow string hand's controller.
    this.triggerValue = Controller.getValue(
        TRIGGER_CONTROLS[(this.bowstringHand === 'right') ? 1 : 0]);

    this.bowProperties = Entities.getEntityProperties(this.entityID,
                                                      ['position', 'rotation']);

    var arrowShelfPosition = this.getArrowShelfPosition(this.bowProperties);

    // TESTING ONLY
    if (!testEntityID) {
      testEntityID = Entities.addEntity({
        type: 'Box',
        name: 'bow-test-cube',
        position: arrowShelfPosition,
        collisionless: true
      });
    } else {
      Entities.editEntity(testEntityID, {position: arrowShelfPosition});
    }
    // END TESTING ONLY

    var bowstringHandPosition =
            this.getControllerLocation(this.bowstringHand).position;
    var bowstringHandToArrowShelf =
            Vec3.subtract(arrowShelfPosition, bowstringHandPosition);
    var pullBackDistance = Vec3.length(bowstringHandToArrowShelf);

    // if (this.state == STATE_IDLE) {

    //   this.pullBackDistance = 0;
    //   this.resetBowStringToIdle();

    //   if (this.triggerValue >= DRAW_BOW_STRING_THRESHOLD
    //       && pullBackDistance < NEAR_TO_RELAXED_NOCK_DISTANCE
    //       && !this.backHandBusy) {

    //     this.state = STATE_ARROW_GRABBED;

    //   }
    // }

    // if (this.state == STATE_ARROW_GRABBED) {
    //   //
    // }

  };

  Bow.prototype.createBowString = function() {
    this.bowStringID = Entities.addEntity({
      type: 'Line',
      name: BOW_STRING_NAME,
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

  Bow.prototype.resetBowStringToIdle = function() {
    Entities.editEntity(this.stringID, {
      linePoints: [ {x: 0, y: 0, z: 0 }, {x: 0, y: -1.2, z: 0 } ],
      lineWidth: 10,
      localPosition: {x: 0, y: 0.6, z: 0.1 },
      localRotation: {w: 1, x: 0, y: 0, z: 0 },
    });
  };

  Bow.prototype.getArrowShelfPosition = function(bowProperties) {
    // Get the vector pointing forward from the bow origin
    var frontVector = Quat.getFront(bowProperties.rotation);
    // Offset the bow's forward vector to get the arrow shelf forward vector
    var arrowShelfVectorForward = Vec3.multiply(frontVector, ARROW_SHELF_OFFSET_FORWARD);
    // Get the vector pointing up form the bow origin
    var upVector = Quat.getUp(bowProperties.rotation);
    // Offset the bow's up vector to the arrow shelf up vector
    var arrowShelfVectorUp = Vec3.multiply(upVector, ARROW_SHELF_OFFSET_UP);
    // Calc the horizontal position of the arrow shelf
    var arrowShelfPosition = Vec3.sum(bowProperties.position, arrowShelfVectorForward);
    // Adjust the vertical position of the arrow shelf vector
    arrowShelfPosition = Vec3.sum(arrowShelfPosition, arrowShelfVectorUp);

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
            var offset = getGrabPointSphereOffset(handController);
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



  var bow = new Bow();

  // TODO: Subscribe to messaging on bow instance

  return bow;

});