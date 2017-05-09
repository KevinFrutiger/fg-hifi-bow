(function() {

  print('this is the bow function body');

  const BOW_STRING_NAME = 'Hifi-Bow-String';

  function Bow() {
    print('Bow constructor');
  }

  Bow.prototype.preload = function(entityID) {
    print('Bow preload');
    this.entityID = entityID;
    this.createBowString();
  };

  Bow.prototype.startEquip = function(entityID, args) { // args is [joint name, jointid], i think
    print('startEquip', entityID, args);

    this.bowHand = args[0];
    this.bowStringHand = (this.bowHand === 'left') ? 'right' : 'left';

    // Stop entity from colliding with things
    Entities.editEntity(entityID, {
      collidesWith: ''
    });

    // Toggle the grabbable key, so no-one else can grab the bow (including you with your other hand).
    var data = getEntityCustomData('grabbableKey', entityID, {});
    data.grabbable = false;
    setEntityCustomData('grabbableKey', entityID, data);


    // TODO: run an interval to call an update method on this object to check for state changes
  };

  Bow.prototype.releaseEquip = function(entityID, args) {

    print('releaseEquip', entityID, args)

    // Make the bow grabbable by everyone (including yourself)
    var data = getEntityCustomData('grabbableKey', entityID, {});
    data.grabbable = true;
    setEntityCustomData('grabbableKey', entityID, data);

    // Make bow collidable again with anything
    Entities.editEntity(entityID, {
        collidesWith: "static,dynamic,kinematic,otherAvatar,myAvatar"
    });
  };

  Bow.prototype.createBowString = function() {
    this.bowStringID = Entities.addEntity({
      type: 'Line',
      name: BOW_STRING_NAME,
      parentID: this.entityID,
      collisionless: true,
      ignoreForCollisions: 1,
      dimensions: { "x": 5, "y": 5, "z": 5 }, // Has to be here for string to show. Not sure why it's 5 x 5 x 5. 1 x 1 x 1 doesn't work.
      linePoints: [ { "x": 0, "y": 0, "z": 0 }, { "x": 0, "y": -1.2, "z": 0 } ],
      lineWidth: 10,
      color: { red: 153, green: 102, blue: 51 },
      localPosition: { "x": 0, "y": 0.6, "z": 0.1 }, // Not documented, but needed to put in correct position.
      localRotation: { "w": 1, "x": 0, "y": 0, "z": 0 }, // Not documented. Doesn't seem to have any affect.
      userData: JSON.stringify({
        grabbableKey: {
          grabbable: false
        }
      })
    });
  };

  var bow = new Bow();

  // TODO: Subscribe to messaging on bow instance

  return bow;

});