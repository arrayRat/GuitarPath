// songManager.js
import VexFlow from "vexflow";
const VF = VexFlow;

// SongManager handles score data: measures, events, and timing
export class SongManager {
  constructor(timeSignature = "4/4") {
    this.timeSignature = timeSignature;
    this.measures = [this._createEmptyMeasure()];
  }

  // Create a new empty measure object
  _createEmptyMeasure() {
    return {
      time: this.timeSignature,
      events: [],
      totalTicks: 0,
    };
  }

  // Return max ticks allowed per measure based on time signature
  _getMaxTicksPerMeasure() {
    const [beats, beatValue] = this.timeSignature.split("/").map(Number);
    return (1024 * 4 / beatValue) * beats; // Example: 4096 for 4/4
  }

  // Convert a duration string to a tick count (e.g., "q" → 1024)
  _getTicksForDuration(duration) {
    const durationTicks = {
      "w": 4096, // whole note
      "h": 2048, // half note
      "q": 1024, // quarter note
      "8": 512,  // eighth note
      "16": 256  // sixteenth note
    };

    const isDotted = duration.endsWith("d");
    const base = isDotted ? duration.slice(0, -1) : duration;
    const baseTicks = durationTicks[base];
    if (baseTicks == null) return null;

    return isDotted ? Math.floor(baseTicks * 1.5) : baseTicks;
  }

  // Add an event (note or rest) to the score, automatically filling measures
  addEvent(event) {
    const ticks = this._getTicksForDuration(event.duration);
    if (ticks == null) {
      console.warn("Invalid duration:", event.duration);
      console.warn("Skipping invalid event", event);
      return;
    }

    const maxTicks = this._getMaxTicksPerMeasure();
    let current = this.measures[this.measures.length - 1];

    // Create new measure if current one is full
    if (!current || current.totalTicks + ticks > maxTicks) {
      current = this._createEmptyMeasure();
      this.measures.push(current);
    }

    current.events.push(event);
    current.totalTicks += ticks;

    console.log(
      `[addEvent] Added ${event.duration}, ticks: ${ticks}, total in measure: ${current.totalTicks}/${maxTicks}`
    );
  }

  // Add event to a specific measure (used when measure is actively selected)
  addEventToMeasure(index, event) {
    const ticks = this._getTicksForDuration(event.duration);
    if (ticks == null) {
      console.warn("Invalid duration:", event.duration);
      return false;
    }

    const maxTicks = this._getMaxTicksPerMeasure();
    if (!this.measures[index]) {
      console.warn("No measure to add to:", index);
      return false;
    }

    const target = this.measures[index];
    if (target.totalTicks + ticks > maxTicks) {
      console.warn("Measure is full, cannot add.");
      return false;
    }

    target.events.push(event);
    target.totalTicks += ticks;

    console.log(`Added to measure ${index}: ${event.duration}, total ticks: ${target.totalTicks}/${maxTicks}`);
    return true;
  }

  // Get all measures
  getMeasures() {
    return this.measures;
  }

  // Overwrite all measures
  setMeasures(measures) {
    this.measures = measures;
  }

  // Change time signature and reset score
  setTimeSignature(sig) {
    this.timeSignature = sig;
    this.measures = [this._createEmptyMeasure()];
    console.log(`Time signature changed to ${sig}`);
  }

  // Create a deep clone of the score (for undo support)
  clone() {
    return JSON.parse(JSON.stringify({
      timeSignature: this.timeSignature,
      measures: this.measures
    }));
  }

  // Restore a previously cloned score
  restore(state) {
    this.timeSignature = state.timeSignature;
    this.measures = state.measures;
  }
}