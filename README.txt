CrownFlow 0.9.0

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


CROWNFLOW 0.9.0 NOTES
- The History destination is now accessed through Insights as Detailed History.
- Settings are grouped into separate pages.
- Weather uses Open-Meteo forecasts and Android’s built-in geocoder for one-time location-to-city lookup. Location is requested only after the user taps Use current location once; no background location permission is used.
- Weather checks on app open/resume when the 7:00 or 14:00 local city refresh slot has passed, and can be refreshed manually or with Home pull-to-refresh.
- Home pull-to-refresh refreshes Health Connect and weather together.
- Periodic Health Connect polling and the periodic weekly-review timer were removed to reduce background work.
- Exported JSON backups omit the PC pairing secret.
- The Android application ID remains com.crown.crownwatch for upgrade compatibility.
- Weather provider attribution: Weather data by Open-Meteo.com (CC BY 4.0).


CROWNFLOW 0.9.1 WEATHER OUTLOOK UPDATE
- Home weather card now includes a 24-hour meaningful-change outlook and upcoming hourly conditions.
- Forecast highlights significant rain/thunderstorms, very hot conditions, sharp warming/cooling, and strong wind gusts.
- Optional weather-change notification can be enabled in Settings > Weather; it is scheduled up to 30 minutes before the expected change.
- Weather times are converted using the selected city's timezone.
- Open-Meteo attribution remains in Weather settings, not on Home.
- Weather refresh remains on app open/resume after the scheduled 7 AM / 2 PM local refresh slots, or manual refresh. No continuous background polling is introduced.


CrownFlow 0.9.2 weather providers: WeatherAPI.com can be configured with a user-supplied key in Settings > Weather. The key is stored using Android secure storage and is excluded from backups. Open-Meteo remains the automatic fallback. Weather forecast times are displayed in 12-hour format with minutes.


CROWNFLOW 0.9.5 UPDATE NOTES
- Adds in-app voice task creation with tap-to-start/stop and hold-to-talk modes.
- Speech is transcribed by the Android speech recognition service. Internet use depends on the phone speech service and installed language packs.
- CrownFlow does not run a background microphone. A task is never saved automatically: review and confirm it first.
- Adds optional two-provider weather aggregation when a WeatherAPI.com key is saved. Open-Meteo remains available without an account or key.
- Android package ID remains com.crown.crownwatch; versionCode is now 14.


CrownFlow 0.9.5 notes
- Voice task control is configurable in Settings > Voice & Speech (tap, hold, or mixed).
- Detailed History includes quick ranges, a six-month date picker, daily task/focus/activity views, and 180-day retention.
- Health & Activity includes an explicit 180-day Health Connect import. Historical totals are stored locally.
- App & Data includes a separate Clear history action.
- Weather aggregation checks Open-Meteo Best Match, ECMWF IFS, DWD ICON Global, Visual Crossing, optional WeatherAPI, and optional NiMet station forecasts. Provider failures are skipped.
