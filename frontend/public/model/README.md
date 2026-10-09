# Pill recognition model (optional)

Put the 3 files exported from Google Teachable Machine here:

    model.json
    metadata.json
    weights.bin

Then redeploy. The "Verify medicine" page switches from the basic colour/shape check
to the trained AI model automatically. If these files are missing nothing breaks.

## How to train (free, ~15 minutes)
1. Go to https://teachablemachine.withgoogle.com  ->  Get Started  ->  Image Project  ->  Standard image model.
2. Make one class per medicine. **Name each class exactly like the medicine in the app**
   (for example `Metformin 500mg`). "Metformin" also works if the first word matches.
3. Add one more class called `No pill` and photograph the empty background/hand.
4. Take 50+ photos per class with the webcam: different angles, both sides of the pill,
   different light, the same kind of background you will really use.
5. Click Train Model, test it in the preview.
6. Export Model -> Tensorflow.js -> Download my model. Unzip and copy the 3 files here.

The AI only says "verified" when it is at least 80% sure AND the class matches the medicine
selected in the app.
