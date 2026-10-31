CrownFlow 0.8.0

CrownFlow is an offline-first weekly accountability app. Existing CrownWatch 0.7 users should install this release as an upgrade; the Android application ID remains com.crown.crownwatch and the local storage key remains taskalarm.v1.

Core features
- Weekly task planning, reminders, task proof, task timers, carry-over, and read-only history.
- Pomodoro Focus timer with 25-minute focus, 5-minute short break, and a 15-minute long break after four completed focus sessions. Durations and daily/weekly goals are configurable.
- Focus sessions can optionally be associated with a planned task. Focus never completes a task automatically.
- Pause, resume, end early, and distraction tracking. Timer progress is calculated from saved timestamps so it can recover after backgrounding or reopening.
- Optional offline ambient sounds: Rain, Forest, Fireplace, White noise, and Brown noise. Playback can continue in the background using Android media playback controls. No microphone permission is requested.
- Task and Focus history, Focus statistics, and automatically saved weekly reviews with manual access in Insights. Weekly review reminders are opt-in and off by default.
- Health Connect activity dashboard and weekly steps/active-calorie reporting remain separate from productivity statistics.
- PC key pairing, QR proof, photo proof, Walk Sessions, notifications, and existing reminder jingles are retained.

Data and compatibility
- Existing task, completion, reminder, pairing, and walk-session data is migrated in place.
- Do not uninstall the previous app as a troubleshooting step; uninstalling may erase local data.
- The application ID is intentionally unchanged to preserve upgrade compatibility. APK signing compatibility still needs to be verified against the previously installed release.

Build
- GitHub Actions builds the arm64-v8a release APK on pushes to main or by manual workflow dispatch.
- Open Actions, select Build APK, and download the CrownFlow-apk artifact from a successful run.
- Install over the previous version to test the upgrade path. Confirm that tasks, history, reminders, and PC pairing are still present.

Important test checklist
1. Upgrade from CrownWatch 0.7 without uninstalling; verify existing data remains.
2. Start a Focus session, pause it, resume it, background the app, and reopen it. Verify the remaining time is correct.
3. Let a Focus session complete and verify it records once and starts the appropriate break. Confirm the fourth completed Focus session leads to a long break.
4. Use the distraction control and verify distraction time is excluded from focus time.
5. Play each ambient loop, change sounds, adjust volume, navigate away from Focus, lock the screen, and test incoming-call/audio interruption behavior.
6. Verify the weekly review is created once per closed week and does not change after creation. Verify the Monday reminder is off by default and can be enabled.
7. Verify task reminders, ringtone selection, QR/photo proof, Health Connect, Walk Sessions, and Android Back navigation.

This source has passed static JavaScript/JSX parsing and focused timer/review logic tests. A native Android release build and on-device audio/background playback tests have not yet been run in this environment.
