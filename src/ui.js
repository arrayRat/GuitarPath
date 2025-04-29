import { getPitchFromFret } from "./utils.js";

// Maps string numbers to their standard tuning labels (for display in fretboard UI)
function getStringLabel(string) {
  const labels = {
    6: "E",
    5: "A",
    4: "D",
    3: "G",
    2: "B",
    1: "E"
  };
  return labels[string] || `String ${string}`;
}

// Main function to initialize the fretboard UI and wire up interactions
export function initFretboardUI(score, resizeAndRender, undoStack) {
  const fretboard = document.getElementById("fretboard");
  let selectedFrets = [];

  // Dynamically generates the 6-string, 24-fret table with string labels
  function createFretboard() {
    fretboard.innerHTML = "";

    const table = document.createElement("table");
    table.className = "fretboard";

    // Reverse order so that string 1 (high E) is on the bottom visually
    const stringNumbers = [6, 5, 4, 3, 2, 1].reverse();
    for (let string of stringNumbers) {
      const row = document.createElement("tr");

      // Left-side string label (e.g., E, A, D, etc.)
      const label = document.createElement("td");
      label.textContent = getStringLabel(string);
      label.className = "string-label";
      row.appendChild(label);

      // Create 0–24 fret cells for this string
      for (let fret = 0; fret <= 24; fret++) {
        const td = document.createElement("td");
        td.textContent = fret;
        td.dataset.string = string;
        td.dataset.fret = fret;

        // Click handler for selecting/deselecting a fret
        td.addEventListener("click", () => {
          const s = parseInt(td.dataset.string);
          const f = parseInt(td.dataset.fret);

          // If already selected, deselect it
          const existing = selectedFrets.find(pos => pos.string === s);
          if (existing && existing.fret === f) {
            selectedFrets = selectedFrets.filter(pos => !(pos.string === s && pos.fret === f));
            td.classList.remove("selected");
          } else {
            // Clear selection on this string
            selectedFrets = selectedFrets.filter(pos => pos.string !== s);
            [...table.querySelectorAll(`td[data-string="${s}"]`)].forEach(el =>
              el.classList.remove("selected"));

            // Select new fret
            selectedFrets.push({ string: s, fret: f });
            td.classList.add("selected");
          }
        });

        row.appendChild(td);
      }

      table.appendChild(row);
    }

    fretboard.appendChild(table);
  }

  // Generate the table immediately on initialization
  createFretboard();

  // Handle note entry when user presses Enter
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && selectedFrets.length > 0) {
      // Snapshot state for undo
      undoStack.push(JSON.parse(JSON.stringify(score.getMeasures())));

      // Use the currently selected duration from the UI
      const duration = window.currentDuration || "q";

      // Build arrays for string, fret, and calculated pitch values
      const string = selectedFrets.map(f => f.string);
      const fret = selectedFrets.map(f => f.fret);
      const pitch = selectedFrets.map(f => getPitchFromFret(f.string, f.fret));

      // Construct the note event object
      const event = {
        type: "note",
        duration,
        fret,
        string,
        pitch,
        technique: window.currentTechnique || "",
        slideFromPrevious: false
      };

      // Apply technique-specific modifiers
      if (event.technique === "hammer") {
        event.annotation = "h";
      } else if (event.technique === "pull") {
        event.annotation = "p";
      } else if (event.technique === "slide") {
        event.annotation = "/";
      } else if (event.technique === "harmonic") {
        event.useParens = true;
        event.fret = fret.map(f => `(${f})`);
      }

      // If a measure is selected, insert there
      const measureIndex = window.activeMeasureIndex;
      if (measureIndex !== null && measureIndex >= 0) {
        const success = score.addEventToMeasure(measureIndex, event);
        if (!success) {
          alert("❌ That measure is full.");
          return;
        }
      } else {
        // Otherwise, auto-create/fill measures
        score.addEvent(event);
      }

      // Re-render and clear selected frets
      resizeAndRender();
      selectedFrets = [];
      document.querySelectorAll(".fretboard td").forEach(td => td.classList.remove("selected"));
    }
  });
}
