# Lesson teaching audio (Path A)

Pre-rendered Ren voice clips for Professional Mode lessons.

## Layout

```
public/audio/lessons/
  PM-0.1/
    english/
      manifest.json
      <sha256-16>.mp3
    tanglish/          ← same pattern when generated
  PM-1.1/              ← later lessons
    ...
```

## What is stored here

- Static teaching lines only: `ren_voice`, `setup_voice`, `lesson_voice`,
  step `voice`, check prompts, canned correct/incorrect replies, hints.
- Generated with `rebon-voice-engine/scripts/prerender_lesson.py` (Indic-Parler-TTS).

## What is NOT stored here

- Live student doubts / dynamic Ren answers → Path B (`POST /rebon-tts/speak`).
- Student mic recordings (separate feature; currently disabled).

## Regenerate PM-0.1 English

```bat
cd rebon-voice-engine
.venv\Scripts\python.exe scripts\prerender_lesson.py --lesson ..\commu-craft-coach-main\commu-craft-coach-main\src\data\cloud\professional_mode\lessons\PM-0.1_english.json
```
