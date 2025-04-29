// utils.js — Tone.js-based playback utilities for GuitarPath

import * as Tone from "tone";

let synth = null;               // Holds the Tone.js PolySynth instance
let currentPlayId = 0;          // Used to prevent overlapping playback
let scheduledEvents = [];       // Array of scheduled Transport events

// Load and configure the Tone.js synth, no time for sampling guitar.
export async function loadGuitarSampler() {
  if (!synth) {
    const gainNode = new Tone.Gain(0.75).toDestination(); // Default volume at 75%
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: {
        attack: 0.002,
        decay: 0.05,
        sustain: 0.05,
        release: 0.02
      }
    }).connect(gainNode);

    // Expose synth and volume control globally for volume slider to access
    window.synth = synth;
    window.gainNode = gainNode;
  }
}

// Playback a score using Tone.Transport
export async function playSong(measures, tempo = 120, onFinish = () => {}) {
  await loadGuitarSampler();   // Ensure synth is ready
  await Tone.start();          // Resume the audio context

  stopPlayback();              // Stop any existing playback
  Tone.Transport.bpm.value = tempo;

  // Map your durations to Tone.js string format
  const durationMap = {
    "16": "16n",  "8": "8n",  "q": "4n",  "h": "2n",  "w": "1n",
    "16d": "16n.", "8d": "8n.", "qd": "4n.", "hd": "2n.", "wd": "1n."
  };

  const thisPlayId = ++currentPlayId;  // Track this session
  let tick = 0;                        // Simulated time in beats
  scheduledEvents = [];

  for (const measure of measures) {
    for (const ev of measure.events) {
      if (thisPlayId !== currentPlayId) return; // Abort if interrupted

      const dur = ev.duration || "q";
      const durationStr = durationMap[dur] || "4n";
      const transportTime = `+${(tick * 60) / tempo}`; // Convert ticks to transport time

      if (ev.type === "note") {
        // Convert frets and strings to pitch names
        const frets = Array.isArray(ev.fret) ? ev.fret : [ev.fret];
        const strings = Array.isArray(ev.string) ? ev.string : [ev.string];
        const chord = frets.map((fret, i) => getPitchFromFret(strings[i], fret));

        // Schedule the note playback
        const id = Tone.Transport.schedule(time => {
          synth.triggerAttackRelease(chord, Tone.Time(durationStr).toSeconds(tempo), time);
        }, transportTime);

        scheduledEvents.push(id);
      }

      // Increment tick by duration in beats
      tick += Tone.Time(durationStr).toSeconds(tempo) / (60 / tempo);
    }
  }

  Tone.Transport.start("+0.1");  // Slight delay
  const totalSeconds = tick * (60 / tempo);
  setTimeout(() => {
    if (thisPlayId === currentPlayId) onFinish();
  }, totalSeconds * 1000);
}

// Stop playback and cancel
export function stopPlayback() {
  currentPlayId++;
  Tone.Transport.stop();
  Tone.Transport.cancel();
  scheduledEvents = [];
  if (synth) synth.releaseAll();
  console.log("Playback stopped");
}

// Given a string and fret, return a pitch name like "C4"
export function getPitchFromFret(string, fret) {
  const standardTuning = ["e/2", "a/2", "d/3", "g/3", "b/3", "e/4"]; //index 0 = E
  const midiMap = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }; //# semitones above c, midi starts at C-1 = 0

  try {
    const tuningNote = standardTuning[6 - string]; // Strings numbered 6 (low E) to 1 (high E) -> get string ex e/2
    const [note, octaveStr] = tuningNote.toLowerCase().split("/"); // ex. get note = e, octave = 2
    const baseMidi = (parseInt(octaveStr) + 1) * 12 + midiMap[note]; // ex. (2 + 1) * 12 = 36 + 4 (miniMap, e: 4)  -> get E2
    const finalMidi = baseMidi + fret; //ex. fret 3 on low E add 3 semitones

    const noteNames = {
      0: "C", 1: "C#", 2: "D", 3: "D#", 4: "E", 5: "F",
      6: "F#", 7: "G", 8: "G#", 9: "A", 10: "A#", 11: "B"
    };
    const pitchClass = noteNames[finalMidi % 12];
    const octave = Math.floor(finalMidi / 12) - 1;
    return `${pitchClass}${octave}`; // string, fret
  } catch (err) {
    console.error("getPitchFromFret failed", err, { string, fret });
    return "C4";
  }
}

// Raise pitch by 1 octave for standard notation display
export function transposePitch(pitch) {
  try {
    const match = pitch.match(/^([A-G]#?)(\d)$/i);
    if (!match) return pitch;
    const [, note, octave] = match;
    return `${note.toUpperCase()}${parseInt(octave) + 1}`;
  } catch {
    return pitch;
  }
}

// Convert pitch string like "C4" to MIDI number
export function pitchToMidi(pitch) {
  const noteMap = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
  const [noteRaw, octaveStr] = pitch.toUpperCase().split(/(?=\d)/);
  const octave = parseInt(octaveStr);
  const note = noteMap[noteRaw];
  return (octave + 1) * 12 + note;
}

// Convert "C4" to "c/4" for use in VexFlow
export function convertToVexflowKey(pitch) {
  try {
    const match = pitch.match(/^([A-G]#?)(\d)$/i);
    if (!match) return "b/4";
    const [, note, octave] = match;
    return `${note.toLowerCase()}/${octave}`;
  } catch {
    return "b/4";
  }
}

// Playback starting at a specific measure index
export async function playFromMeasure(startIndex, measures, tempo = 120, onFinish = () => {}) {
  const subset = measures.slice(startIndex); // Trim preceding measures
  return await playSong(subset, tempo, onFinish);
}

// Get a specific note or rest event by index
export function getEventAt(measureIndex, eventIndex, measures) {
  if (!measures[measureIndex]) return null;
  return measures[measureIndex].events[eventIndex] || null;
}
