// main.js — GuitarPath Tab Editor Main Logic (Tone.js + VexFlow)

// External imports
import VexFlow from "vexflow";
import { SongManager } from "./songManager.js";
import { initFretboardUI } from "./ui.js";
import { transposePitch, playSong, stopPlayback, convertToVexflowKey, playFromMeasure } from "./utils.js";
import { exportJSON, importJSON, exportPDF } from "./fileManager.js";

// Initialize core VexFlow classes
const VF = VexFlow;
const score = new SongManager("4/4");
const undoStack = [];

// Global tempo and selected measure for editing/playback
let currentTempo = 120;
window.activeMeasureIndex = null;

// Setup VexFlow SVG renderer
const renderer = new VF.Renderer("notation", VF.Renderer.Backends.SVG);
const context = renderer.getContext();
context.setFont("Arial", 12, "").setFillStyle("#000");
document.getElementById("notation").appendChild(context.svg);

// Layout config
const measuresPerRow = 4;
const baseMeasureWidth = 240;
const topMargin = 60;
const rowSpacing = 260;
const staveSpacing = 100;
const measureGap = 0;
const sidePadding = 60;

// Render the full score from the current state
function renderScore() {
  context.clear();
  document.querySelectorAll(".measure-click-area").forEach(el => el.remove());

  const measures = score.getMeasures().filter(m => m.events.length > 0);
  const timeSig = score.timeSignature;

  // Determine width scaling based on notes per measure
  const noteCounts = measures.map(m => m.events.length);
  const maxNotes = Math.max(...noteCounts, 4);
  const uniformWidth = baseMeasureWidth + Math.max(0, maxNotes - 4) * 25;
  const globalMaxWidth = uniformWidth * measuresPerRow;

  let x = sidePadding;
  let y = topMargin;
  let col = 0;

  measures.forEach((measure, index) => {
    const stave = new VF.Stave(x, y, uniformWidth);
    const tabStave = new VF.TabStave(x, y + staveSpacing, uniformWidth);

    if (col === 0) {
      // Draw clefs and time signature only at start of line
      stave.addClef("treble").addTimeSignature(timeSig);
      tabStave.addClef("tab");
      new VF.StaveConnector(stave, tabStave).setType("brace").setContext(context).draw();
      new VF.StaveConnector(stave, tabStave).setType("single").setContext(context).draw();
    }

    stave.setContext(context).draw();
    tabStave.setContext(context).draw();

    const stdNotes = [];
    const tabNotes = [];

    for (let i = 0; i < measure.events.length; i++) {
      const ev = measure.events[i];

      if (ev.type === "note") {
        const keys = Array.isArray(ev.pitch)
          ? ev.pitch.map(p => convertToVexflowKey(transposePitch(p)))
          : [convertToVexflowKey(transposePitch(ev.pitch))];

        let positions = Array.isArray(ev.fret)
          ? ev.fret.map((f, j) => ({ fret: f.toString(), str: ev.string[j] }))
          : [{ fret: ev.fret.toString(), str: ev.string }];

        // Strip annotation characters for rendering but preserve them for display
        positions = positions.map(pos => {
          let fret = pos.fret.toString().replace(/[()hps\/]/g, "");
          if (ev.useParens) fret = `(${fret})`;
          else if (ev.annotation) fret += ev.annotation;
          return { fret, str: pos.str };
        });

        const isDotted = ev.duration.endsWith("d");
        const baseDuration = isDotted ? ev.duration.slice(0, -1) : ev.duration;
        const note = new VF.StaveNote({ keys, duration: baseDuration });

        if (isDotted) VF.Dot.buildAndAttach([note]);

        // Add accidentals if applicable
        note.keys.forEach((key, k) => {
          const noteName = key.split("/")[0].toLowerCase();
          if (noteName !== "b" && noteName.includes("#")) {
            note.addModifier(new VF.Accidental("#"), k);
          }
        });

        stdNotes.push(note);

        const tabNote = new VF.TabNote({ positions, duration: baseDuration });
        if (isDotted) VF.Dot.buildAndAttach([tabNote]);

        tabNotes.push(tabNote);
      } else if (ev.type === "rest") {
        stdNotes.push(new VF.StaveNote({ keys: ["b/4"], duration: ev.duration + "r" }));
        tabNotes.push(new VF.GhostNote(ev.duration));
      }
    }

    const [beats, beatValue] = timeSig.split("/").map(Number);
    const stdVoice = new VF.Voice({ num_beats: beats, beat_value: beatValue }).setStrict(false);
    stdVoice.addTickables(stdNotes);
    const tabVoice = new VF.Voice({ num_beats: beats, beat_value: beatValue }).setStrict(false);
    tabVoice.addTickables(tabNotes);

    const beams = VF.Beam.generateBeams(stdNotes);

    new VF.Formatter()
      .joinVoices([stdVoice])
      .joinVoices([tabVoice])
      .formatToStave([stdVoice, tabVoice], stave);

    stdVoice.draw(context, stave);
    tabVoice.draw(context, tabStave);

    // Add clickable overlay to select this measure
    const wrapper = document.createElement("div");
    wrapper.className = "measure-click-area";
    if (index === window.activeMeasureIndex) {
      wrapper.classList.add("active-measure");
    }

    wrapper.style.position = "absolute";
    wrapper.style.left = `${x}px`;
    wrapper.style.top = `${y}px`;
    wrapper.style.width = `${uniformWidth}px`;
    wrapper.style.height = `${tabStave.getBottomY() - stave.getY()}px`;
    wrapper.style.zIndex = 10;
    wrapper.dataset.measureIndex = index;

    wrapper.addEventListener("click", (e) => {
      const clickedIndex = parseInt(wrapper.dataset.measureIndex);
      if (window.activeMeasureIndex === clickedIndex) {
        window.activeMeasureIndex = null;
        wrapper.classList.remove("active-measure");
      } else {
        window.activeMeasureIndex = clickedIndex;
        document.querySelectorAll(".measure-click-area").forEach(el =>
          el.classList.remove("active-measure"));
        wrapper.classList.add("active-measure");
      }
      e.stopPropagation();
    });

    document.getElementById("notation").appendChild(wrapper);
    beams.forEach(b => b.setContext(context).draw());

    col++;
    if (col >= measuresPerRow) {
      col = 0;
      x = sidePadding;
      y += rowSpacing;
    } else {
      x += uniformWidth;
    }
  });

  // Resize the SVG canvas to fit all rendered staves
  const totalHeight = topMargin + (Math.ceil(measures.length / measuresPerRow) * rowSpacing) + staveSpacing;
  const totalWidth = sidePadding * 2 + globalMaxWidth;
  renderer.resize(totalWidth, totalHeight);
  document.getElementById("notation").appendChild(context.svg);
}

// Clear and rerender after any data changes
function resizeAndRender() {
  document.getElementById("notation").innerHTML = "";
  renderScore();
}

// Add a rest to the selected or latest measure
function addRest(duration) {
  undoStack.push(JSON.parse(JSON.stringify(score.getMeasures())));
  if (window.activeMeasureIndex !== null) {
    score.addEventToMeasure(window.activeMeasureIndex, { type: "rest", duration });
  } else {
    score.addEvent({ type: "rest", duration });
  }
  resizeAndRender();
}

// Undo logic — scoped to active measure if selected, otherwise global
function undoLastEvent() {
  if (window.activeMeasureIndex !== null) {
    const measures = score.getMeasures();
    const target = measures[window.activeMeasureIndex];
    if (target && target.events.length > 0) {
      undoStack.push(score.clone());
      target.events.pop();
      target.totalTicks = target.events.reduce((sum, ev) => {
        const base = { "w": 4096, "h": 2048, "q": 1024, "8": 512, "16": 256 };
        const isDotted = ev.duration.endsWith("d");
        const key = ev.duration.replace("d", "");
        let ticks = base[key] || 0;
        if (isDotted) ticks = Math.floor(ticks * 1.5);
        return sum + ticks;
      }, 0);
      resizeAndRender();
      return;
    }
  }

  if (undoStack.length > 0) {
    const prevState = undoStack.pop();
    score.setMeasures(prevState);
    resizeAndRender();
  }
}

// Wire up buttons for rests and undo
document.querySelectorAll("button[data-rest]").forEach(btn => {
  btn.addEventListener("click", () => addRest(btn.dataset.rest));
});
const undoBtn = document.getElementById("undo-button");
if (undoBtn) undoBtn.addEventListener("click", undoLastEvent);

// Initialize everything on page load
document.addEventListener("DOMContentLoaded", () => {
  initFretboardUI(score, resizeAndRender, undoStack);
  renderScore();

  // Time Signature Change
  const timeSigSelector = document.getElementById("timeSig");
  if (timeSigSelector) {
    timeSigSelector.addEventListener("change", (e) => {
      const selected = e.target.value;
      score.setTimeSignature(selected);
      resizeAndRender();
    });
  }

  // Playback buttons
  let isPlaying = false;
  const tempoSlider = document.getElementById("tempo");
  const tempoLabel = document.getElementById("tempo-value");
  const playBtn = document.getElementById("play-button");
  const stopBtn = document.getElementById("stop");

  tempoSlider.addEventListener("input", () => {
    currentTempo = parseInt(tempoSlider.value);
    tempoLabel.textContent = currentTempo;
  });

  playBtn.addEventListener("click", () => {
    if (isPlaying) return;
    isPlaying = true;
    const start = window.activeMeasureIndex ?? 0;
    playFromMeasure(start, score.getMeasures(), currentTempo, () => {
      isPlaying = false;
    });
  });

  stopBtn.addEventListener("click", () => {
    stopPlayback();
    isPlaying = false;
  });

  // Volume control
  document.getElementById("volume").addEventListener("input", () => {
    const volumeValue = parseInt(volumeSlider.value) / 100;
    if (window.gainNode) {
      window.gainNode.gain.rampTo(volumeValue, 0.05);
    }
  });

  // Note duration selection
  window.currentDuration = "q";
  document.querySelectorAll("[data-duration]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-duration]").forEach(b => b.classList.remove("active"));
      button.classList.add("active");
      window.currentDuration = button.dataset.duration;
    });
  });
    // ── Technique selection buttons (ADD THIS BLOCK) ──
    window.currentTechnique = "";  // default = “None”
    document.querySelectorAll("button[data-technique]").forEach(button => {
      button.addEventListener("click", () => {
        // 1. Deselect all
        document
          .querySelectorAll("button[data-technique]")
          .forEach(b => b.classList.remove("active"));
        // 2. Highlight the one you clicked
        button.classList.add("active");
        // 3. Store the choice for ui.js to pick up
        window.currentTechnique = button.dataset.technique;
      });
    });

  // Import/Export handlers
  document.getElementById("export-json").addEventListener("click", () => {
    exportJSON(score);
  });

  document.getElementById("import-json-trigger").addEventListener("click", () => {
    document.getElementById("import-json").click();
  });

  document.getElementById("import-json").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      importJSON(file, score, resizeAndRender);
    }
  });
});
