// fileManager.js
import jsPDF from "jspdf";
import { getPitchFromFret } from "./utils.js";

// Export the current score as a downloadable JSON file
export function exportJSON(score) {
  const data = JSON.stringify(score.getMeasures()); // serialize measure data
  const blob = new Blob([data], { type: "application/json" }); // create file blob
  const url = URL.createObjectURL(blob); // create download URL
  const a = document.createElement("a"); // create anchor
  a.href = url;
  a.download = "score.json"; // set filename
  a.click(); // simulate click to trigger download
}

// Import a JSON score and re-render it in the editor
export function importJSON(file, score, resizeAndRender) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const measures = JSON.parse(event.target.result); // parse file
      score.setMeasures(measures); // load into score manager

      // Patch: Reconstruct pitch values based on fret/string after import
      const rebuilt = score.getMeasures();
      for (const measure of rebuilt) {
        for (const ev of measure.events) {
          if (ev.type === "note") {
            const frets = Array.isArray(ev.fret) ? ev.fret : [ev.fret];
            const strings = Array.isArray(ev.string) ? ev.string : [ev.string];
            ev.pitch = frets.map((fret, i) => getPitchFromFret(strings[i], fret));
          }
        }
      }

      resizeAndRender(); // update display after import
    } catch (err) {
      alert("Invalid JSON file.");
    }
  };

  reader.readAsText(file); // read selected file as string
}

// Export current rendered score as a downloadable PDF
export function exportPDF() {
  const svg = document.querySelector("#notation svg");

  if (!svg) {
    alert("Nothing to export!");
    return;
  }

  // Serialize SVG to string and turn it into a Blob
  const svgData = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    // Create canvas matching SVG size
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    // Convert canvas to PNG data URL
    const pngDataUrl = canvas.toDataURL("image/png");

    // Create PDF and add image
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(pngDataUrl, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save("score.pdf");

    URL.revokeObjectURL(url); // cleanup
  };

  img.onerror = (e) => {
    console.error("Failed to load SVG as image:", e);
    alert("Failed to export PDF.");
  };

  img.src = url; // start image load
}
