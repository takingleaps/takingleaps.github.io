#!/usr/bin/env python3
"""
tts_narrate.py -- script in, narration audio out.
Uses Gemini TTS via the Gemini Developer API. Splits long scripts on section
breaks, synthesizes each in order, concatenates to one audio file.

    set GEMINI_API_KEY=...   (env var -- never paste in chat)
    python tts_narrate.py --script script.md --voice Puck --out narration.mp3
"""
import argparse, base64, json, os, re, struct, subprocess, sys, urllib.request, urllib.error

API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

def split_sections(text):
    text = re.sub(r"\[pause\]", "... ", text)
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.M)
    text = re.sub(r"[*_]{1,2}([^*_]+)[*_]{1,2}", r"\1", text)
    chunks = [c.strip() for c in re.split(r"\n\s*\n", text) if c.strip()]
    merged, buf = [], ""
    for c in chunks:
        buf = (buf + " " + c).strip() if buf else c
        if len(buf) > 400:
            merged.append(buf); buf = ""
    if buf: merged.append(buf)
    return merged

def synthesize(text, model, voice, api_key):
    body = {
        "contents": [{"parts": [{"text": text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}},
        },
    }
    req = urllib.request.Request(
        f"{API_BASE}/{model}:generateContent",
        data=json.dumps(body).encode(),
        headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            payload = json.load(resp)
    except urllib.error.HTTPError as e:
        sys.exit(f"TTS API error {e.code}: {e.read().decode()[:500]}")
    try:
        b64 = payload["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
    except (KeyError, IndexError):
        sys.exit(f"Unexpected TTS response shape: {json.dumps(payload)[:500]}")
    return base64.b64decode(b64)

def write_wav(pcm, path, sample_rate=24000):
    with open(path, "wb") as f:
        f.write(b"RIFF")
        f.write(struct.pack("<I", 36 + len(pcm)))
        f.write(b"WAVEfmt ")
        f.write(struct.pack("<IHHIIHH", 16, 1, 1, sample_rate, sample_rate * 2, 2, 16))
        f.write(b"data")
        f.write(struct.pack("<I", len(pcm)))
        f.write(pcm)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--script", required=True)
    ap.add_argument("--voice", default="Kore")
    ap.add_argument("--model", default="gemini-3.8-flash-lite-tts")
    ap.add_argument("--out", default="narration.mp3")
    args = ap.parse_args()
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        sys.exit("Set GEMINI_API_KEY first (env var -- never paste it in chat).")
    with open(args.script) as f:
        sections = split_sections(f.read())
    words = sum(len(s.split()) for s in sections)
    print(f"{len(sections)} sections, ~{words} words (~{words/150:.1f} min)")
    pcm_all = b""
    for i, section in enumerate(sections, 1):
        print(f"[{i}/{len(sections)}] synthesizing ({len(section)} chars)...", flush=True)
        pcm_all += synthesize(section, args.model, args.voice, api_key)
    wav_path = args.out if args.out.endswith(".wav") else args.out + ".tmp.wav"
    write_wav(pcm_all, wav_path)
    if args.out.endswith(".mp3"):
        r = subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav_path,
                            "-codec:a", "libmp3lame", "-q:a", "3", args.out])
        os.remove(wav_path)
        if r.returncode != 0:
            sys.exit("ffmpeg mp3 conversion failed; WAV kept at " + wav_path)
    print(f"Done: {args.out} ({len(pcm_all)/48000:.1f}s of audio)")

if __name__ == "__main__":
    main()
