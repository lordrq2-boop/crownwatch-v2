CrownWatch 0.6
=================================================================


HOW TO UPDATE YOUR APP WITH THIS VERSION
-----------------------------------------------------------------
You already have the project on GitHub, so this is an update, not a fresh start.

1. Unzip crownwatch-v0.6.zip somewhere temporary (the Desktop is fine). You get a folder called "crownwatch".
2. Open your existing crownwatch project folder, the one you pushed from last time.
   In File Explorer press View, then Show, then tick "Hidden items". You must see a folder called ".git" in there.
   NEVER delete ".git". It is what connects the folder to GitHub.
3. Delete the OLD files so nothing stale is left behind:
   press Ctrl+A to select everything, hold Ctrl and click ".git" to un-select it, then press Delete.
4. Open the unzipped crownwatch folder, press Ctrl+A, Ctrl+C, go back to your project folder and press Ctrl+V.
   Make sure the hidden items came across too: ".github", ".gitignore" and ".gitattributes".
5. Open a terminal in the project folder (click the address bar, type cmd, press Enter) and run:
       git add .
       git commit -m "0.6"
       git push
   (A line-ending warning is harmless.)
6. On GitHub open the Actions tab. A new "Build APK" run starts by itself (about 15 to 30 minutes).
   When it is green, open it, scroll to Artifacts, download CrownWatch-apk, unzip it and send app-release.apk to the phone.
7. Install it over the old app. Your tasks and history stay. In Settings the bottom line should say "CrownWatch 0.6".
   If Android says "App not installed", uninstall the old app first (that clears your tasks) and install again.
If the build fails, open the red run, open the red step, copy the last 60 lines and send them to me.


WHAT CHANGED
-----------------------------------------------------------------
Reminders now ring out
  Each reminder plays a sound for 10, 20 or 30 seconds, then repeats every 5 minutes until the task is done.
  Settings, Ringing sound:
    CrownWatch jingle ..... a soft bell tune made for this app. Pick 10, 20 or 30 seconds. It starts gently and
                            builds, so it gets your attention without being harsh.
    Phone ringtone ........ the phone's own tone. Press "Choose your phone ringtone": Android's sound list opens, pick
                            any ringtone or alarm tone, come back. Until you pick, it plays the default notification
                            sound. (Android does not let an app read your alarm tone directly, so you choose it there.)
  Reminders are marked as alarms, so they play at your phone's ALARM volume and also when the phone is on silent.
  Turn the Alarm volume up in the phone's Sound settings if it is too quiet.
  Opening the app, or finishing the task, stops the ringing.
  "Send a test reminder" in Settings rings in 10 seconds so you can hear it.

The check mark animation bug
  The finish animation was sitting in the normal layout instead of floating over the screen, which pushed the bottom
  bar up, and it never removed itself. It now floats on top, plays for about a second, and removes itself.

Steps through Health Connect (new)
  A task can now be proved by steps. Add a task, choose Steps, choose a goal (2,000 to 12,000). Walk now suggests a
  5,000 step goal.
  The app reads today's steps from Health Connect. When the goal is reached the task finishes by itself, with the
  check mark burst. It checks when you open the app, and every minute while you are on the main tabs. You can also press
  "Check". Cards show your progress, for example 3,420 of 8,000 steps.
  First time: Settings, Health Connect, Connect. Android shows Health Connect's own screen, allow Steps.
  Important: Health Connect does not count steps itself. It holds what another app records, such as Google Fit,
  Mi Fitness or Samsung Health. If it shows 0, open that app once and allow it to share steps with Health Connect.
  On Android 14 and newer Health Connect is built in. On Android 13 and older, install "Health Connect" from the Play Store.
  The app now needs Android 8 or newer (your Redmi is fine).

Permissions (the full list)
  Camera, Notifications, Exact alarms (automatic), Vibrate, Run on restart, and Read steps (only used when you connect
  Health Connect and asked for in Health Connect's own screen). Nothing else, and no internet.


THINGS I COULD NOT TEST FOR YOU
-----------------------------------------------------------------
  - I cannot hear the jingle or try it on your phone. It is 10, 20 and 30 seconds long and was checked for volume level.
    If it is too loud, too quiet or not your taste, tell me and I will change it.
  - Xiaomi can change how the sound list and notification volume behave. If the phone ringtone picker looks odd or the
    reminder is quiet, send me a screenshot of what you see.
  - Health Connect has only been tested against a simulated copy. Please try: Settings, Connect, then a Steps task.


EVERYTHING ELSE IS AS BEFORE
-----------------------------------------------------------------
  - Daily code from the PC key tool (pc-key-tool/CrownWatch-Key.html), timer proof, photo proof.
  - Tasks are locked once saved (5 minute undo), history is read only, 2 skips a week with a long daily sentence.
  - Xiaomi checklist and troubleshooting are in Settings.
