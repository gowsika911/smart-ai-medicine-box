# Train the pill recognition model (about 20 minutes, free)

The app already contains the code. It only needs a model trained on **your own pills**.
Without a model, the "Verify Medicine" page keeps using the basic colour/shape check, so nothing breaks.

## What you need
- The pills (or tablets) of the medicines you added in the app
- A laptop with a webcam, a plain background (white paper or a plain table) and good light
- Chrome

## Steps
1. Open https://teachablemachine.withgoogle.com and click **Get Started** > **Image Project** > **Standard image model**.
2. **Make one class per medicine.** Rename each class to match the medicine name in the app,
   for example `Metformin 500mg`. (`Metformin` also works because the first word is compared.)
3. Add one more class called **No pill**. Use it for the empty background and for your empty hand.
4. For each class click **Webcam** > hold **Hold to Record** and take **60 or more photos**:
   - turn the pill, show both sides, change the distance a little
   - keep the pill in the **middle** of the picture (the app crops the centre square)
   - use the same light and background you will use when showing the pill
   - for "No pill" also record your hand, the table, the paper
5. Click **Train Model** and keep the tab open until it finishes.
6. Test in the **Preview** box. Each pill should show 90%+ for its own class. If two pills look alike,
   take more photos of both, from more angles.
7. Click **Export Model** > **Tensorflow.js** > **Download my model** and unzip it.
   You get three files: `model.json`, `metadata.json`, `weights.bin`.
8. Copy these three files into `frontend/public/model/` in the project (next to the `README.md` there).
9. Commit and push (`git add .`, `git commit -m "Add pill model"`, `git push origin main`). Vercel redeploys.

## Check that it works
Open **Verify Medicine**. The badge at the top should say **AI pill recognition active**.
After you press Capture, a small line shows what the AI saw, for example
`AI saw: Metformin 500mg 97% | Amlodipine 5mg 2% | No pill 1%`.

| Result | What it means |
|---|---|
| "AI verified" | At least 80% sure and it matches the selected medicine. The dose is logged as taken. |
| "Wrong pill?" | At least 80% sure, but it is a different medicine. Logged as mismatched. |
| "Not sure" | Under 80%. Nothing is logged. Improve the light or take more training photos. |
| "No pill detected" | The AI sees the empty background. Nothing is logged. |

## If the badge says "Colour & shape check"
- The three files are not in `frontend/public/model/`, or the names are different.
- You have not redeployed yet.
- Open `https://<your-site>/model/model.json` in the browser. It must show JSON, not the app page.

## Honest limits
- A model trained on 60 webcam photos works for those pills, that light and that background.
  A different camera, a very different light or new pills need more photos or a retrain.
- It is a helper, not a medical safety system. Never rely on it alone.
