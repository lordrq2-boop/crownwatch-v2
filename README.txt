CrownWatch 0.7
=================================================================

WHAT CHANGED IN 0.7
-----------------------------------------------------------------

Health Connect activity dashboard
  The Home screen now shows today's steps against a 3,000-step default goal, active calories, distance, and the latest
  weight reading available in Health Connect. The step goal can be changed in Settings. Health measurements are read
  from Health Connect; CrownWatch does not generate or estimate missing measurements.

  CrownWatch requests read access for Steps, Active Calories Burned, Distance, and Weight. Each permission can be
  granted separately. A missing optional permission or missing source data is shown as unavailable rather than zero.
  Weight is read from the most recent record returned from the last 30 days.

  The app refreshes when it opens, when it returns to the foreground, when Insights is opened, and every 10 minutes
  while the app is active. Health Connect sources can publish data with a delay, so the 10-minute refresh is not a
  guarantee that every upstream fitness app has already written its latest reading.

Separate Walk Session
  Start a 30-minute Walk Session from Home. It measures the increase in daily steps from the starting count and does
  not complete or prove a productivity task. You can return Home while the session remains active. The session expires
  automatically after 30 minutes, including after CrownWatch has been backgrounded or closed.

Productivity task proof
  Steps are no longer a task-proof option. Walk tasks now use a normal timer by default. Existing saved tasks that used
  Tasks that used Steps proof are migrated to 30-minute timer tasks so they remain in the plan and history.

Insights
  Health this week now includes total steps and active calories from Monday through the current time. Existing task
  streak, completion, on-time, and category insights remain.

Navigation and settings
  Android Back now returns to the previous app screen, returns to Home from other tabs, and exits only from Home.
  Running task timers can be left and resumed without cancelling them. House Rules have been removed from Settings;
  their enforcement remains unchanged. A temporary Reset test data control clears tasks/history and active sessions
  while preserving preferences and PC pairing. Remove this control before a public/final release.

HOW TO BUILD THE APK WITH GITHUB ACTIONS
-----------------------------------------------------------------

1. Upload/commit the complete project folder to the main branch. Keep the .github/workflows/build-apk.yml file.
2. GitHub automatically starts the Build APK workflow after a push to main. You can also open Actions and run it manually.
3. Wait for the workflow to finish successfully.
4. Open the successful run, scroll to Artifacts, and download CrownWatch-apk.
5. Extract the artifact and install app-release.apk.

The GitHub workflow runs npm ci itself. Do not upload node_modules. Keep package.json and package-lock.json together.
The workflow creates the native Android project using Expo prebuild before running Gradle.

UPDATE SAFETY
-----------------------------------------------------------------

The Android application ID remains com.crown.crownwatch. The app version is 0.7.0 and Android versionCode is 7.
For an in-place Android update, the new APK must be signed with the same signing certificate as the installed APK.
The GitHub workflow must use a persistent signing keystore for reliable updates between fresh GitHub-hosted runners.
Do not uninstall the current app until you have confirmed that the new APK can update it, or you have backed up any
local data you need to keep.

PRESERVED FEATURES
-----------------------------------------------------------------

  - CrownWatch jingle and phone ringtone selection.
  - Repeated notifications, exact alarm scheduling, and reminder settings.
  - PC key tool pairing and daily QR code verification.
  - Photo proof, timed task proof, weekly planning, carry-over, skip rules, history, and existing insights.
  - Offline-first operation. Health Connect data is read locally; no account or cloud sync is added.

TESTING CHECKLIST
-----------------------------------------------------------------

  - Android Back from Settings, task details, task form, camera proof, pairing, timer, and Walk Session.
  - Leave a task timer, return Home, resume it, and finish it.
  - Connect Health Connect and grant each requested permission.
  - Verify steps, active calories, distance, and latest weight against Health Connect.
  - Verify the 3,000-step goal and change it in Settings.
  - Start a Walk Session, verify its step delta, leave it running, and verify it expires after 30 minutes.
  - Check weekly steps and active calories in Insights.
  - Verify old task data and PC pairing remain after the 0.7 migration.
  - Re-test jingle, phone ringtone, reminder intervals, exact timing, and notifications.
