// lessonPlayer.js
import VexFlow from "vexflow";
import { playSong, stopPlayback, transposePitch, convertToVexflowKey, getPitchFromFret } from "./utils.js";
import * as Tone from "tone";

export function initLessonPlayer(containerId, scoreData) {
  const container = document.getElementById(containerId);
  const VF = VexFlow;
  const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
  const context = renderer.getContext();
  context.setFont("Arial", 12, "").setFillStyle("#000");

  let tempo = 100;
  let isPlaying = false;

  // Convert fret/string pairs to pitch strings
  for (const measure of scoreData) {
    for (const ev of measure.events || []) {
      if (ev.type === "note") {
        const frets = Array.isArray(ev.fret) ? ev.fret : [ev.fret];
        const strings = Array.isArray(ev.string) ? ev.string : [ev.string];
        ev.pitch = frets.map((f, i) => getPitchFromFret(strings[i], f));
      }
    }
  }

  // Insert playback controls
  const controls = document.createElement("div");
  controls.className = "lesson-controls";
  controls.innerHTML = `
    <button id="${containerId}-play">Play</button>
    <button id="${containerId}-stop">Stop</button>
    <label style="margin-left:1rem;">Tempo
      <input id="${containerId}-tempo" type="range" min="40" max="240" value="${tempo}">
    </label>
    <label style="margin-left:1rem;">Volume
      <input id="${containerId}-volume" type="range" min="0" max="1" step="0.01" value="0.8">
    </label>
  `;
  container.parentNode.insertBefore(controls, container);

  function renderScore() {
    context.clear();
    const measuresPerRow = 2;
    const measureWidth = 350;
    const staveSpacing = 150;

    scoreData.forEach((measure, idx) => {
      const row = Math.floor(idx / measuresPerRow);
      const col = idx % measuresPerRow;
      const x = 20 + col * measureWidth;
      const y = 40 + row * staveSpacing * 2;

      const stave = new VF.Stave(x, y, measureWidth);
      const tabStave = new VF.TabStave(x, y + staveSpacing, measureWidth);

      // Only draw clef, time signature, and connectors on the first measure of each row
      if (col === 0) {
        stave.addClef("treble").addTimeSignature(measure.time || "4/4");
        tabStave.addClef("tab");
        new VF.StaveConnector(stave, tabStave).setType("brace").setContext(context).draw();
        new VF.StaveConnector(stave, tabStave).setType("single").setContext(context).draw();
      }

      stave.setContext(context).draw();
      tabStave.setContext(context).draw();

      const stdNotes = [];
      const tabNotes = [];

      (measure.events || []).forEach(ev => {
        if (ev.type === "note") {
          // Build VexFlow key strings as in main
          const keys = Array.isArray(ev.pitch)
            ? ev.pitch.map(p => convertToVexflowKey(transposePitch(p)))
            : [convertToVexflowKey(transposePitch(ev.pitch))];
          const duration = ev.duration + (ev.dotted ? "d" : "");
          const isDotted = !!ev.dotted;

          const note = new VF.StaveNote({ keys, duration });
          // Dots first
          if (isDotted) VF.Dot.buildAndAttach([note]);
          // Sharps only
          note.keys.forEach((key, i) => {
            const name = key.split("/")[0].toLowerCase();
            if (name !== "b" && name.includes("#")) {
              note.addModifier(new VF.Accidental("#"), i);
            }
          });
          stdNotes.push(note);

          // Build tab note
          const frets = Array.isArray(ev.fret) ? ev.fret : [ev.fret];
          const strings = Array.isArray(ev.string) ? ev.string : [ev.string];
          const positions = frets.map((f, i) => ({ fret: f, str: strings[i] }));
          const tabNote = new VF.TabNote({ positions, duration });
          if (isDotted) VF.Dot.buildAndAttach([tabNote]);
          tabNotes.push(tabNote);
        } else if (ev.type === "rest") {
          stdNotes.push(new VF.StaveNote({ keys: ["b/4"], duration: ev.duration + "r" }));
          tabNotes.push(new VF.GhostNote(ev.duration));
        }
      });

      // Format and draw voices
      const voice = new VF.Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);
      voice.addTickables(stdNotes);
      const tabVoice = new VF.Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);
      tabVoice.addTickables(tabNotes);
      new VF.Formatter()
        .joinVoices([voice])
        .joinVoices([tabVoice])
        .formatToStave([voice, tabVoice], stave);
      voice.draw(context, stave);
      tabVoice.draw(context, tabStave);
    });

    const rows = Math.ceil(scoreData.length / measuresPerRow);
    renderer.resize(measureWidth * measuresPerRow + 40, rows * staveSpacing * 2 + 150);
  }

  renderScore();

  // Playback controls
  document.getElementById(`${containerId}-play`).onclick = () => {
    if (isPlaying) return;
    isPlaying = true;
    playSong(scoreData, tempo, () => { isPlaying = false; });
  };
  document.getElementById(`${containerId}-stop`).onclick = () => { stopPlayback(); isPlaying = false; };
  document.getElementById(`${containerId}-tempo`).oninput = e => { tempo = parseInt(e.target.value); };
  document.getElementById(`${containerId}-volume`).oninput = e => { Tone.Destination.volume.value = Tone.gainToDb(parseFloat(e.target.value)); };
}
