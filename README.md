# High Fidelity Bow and Arrow (rework)

Creates a bow and arrow in [High Fidelity](https://highfidelity.com/). Derived from the bow by James B. Pollack in High Fidelity's [Shortbow tutorial](https://wiki.highfidelity.com/wiki/Shortbow_Tutorial), which is the same bow found in the Marketplace. As I worked through the code to understand the API, I revised it to use proper archery terminology, remove dead code, and add comments to improve clarity for the exercise.

There are a few blocks of utility code at the beginning of the file prior to the main bow entity script. Script.include() and the entity's preload event are asynchronous, so I couldn't move that code to external files since I didn't want to confuse the exercise by creating callbacks.

## Running the script

Option 1:

Run spawnBow.js from the following URL using *Edit > Open and Run Script from URL...* in the High Fidelity client:

  http://www.frutigergroup.com/high_fidelity/bow/spawnBow.js

Option 2:

1. Clone this repository or download it using the **Clone or download button**.
2. Place the files where you want to run them.
3. Run spawnBow.js from *Edit > Open and Run Script from File...* in the HiFi client.

Other options (untested):

- You can import the bow model via the Create menu and set up the bow that way if don't want to rerun spawnBow.js. That's beyond the scope of this README. See spawnBow.js for the URLs and proper settings for the Properties panel.

- After running spawnBow.js, you can export the bow entity via *Edit > Export Entities* to create a .json file that you can import at another time.

## Using the bow

The bow should spawn right in front of you and drop to the ground. Grab it, then grab the string with your other hand. The arrow will appear automatically. Pull back and release!

Fired arrows will disappear after a short time.

Note: the bow placement is currently hard-coded for a specific avatar. For some reason hand location varies, so it may not look like your avatar is holding it exactly.


@ 2017 Kevin Frutiger

Bow media assets @ 2016 High Fidelity Inc.