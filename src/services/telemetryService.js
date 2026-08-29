/**
 * Telemetry Service Subsystem
 * Monitors cross-cutting performance metrics across Three.js engine, React UI components, and world entities.
 */

export class TelemetryService {
  constructor(subsystemName) {
    this.subsystem = subsystemName;
    this.metrics = new Map();
    this.startTime = Date.now();
  }

  recordEvent(eventName, payload = {}) {
    const timestamp = Date.now();
    const entry = {
      subsystem: this.subsystem,
      eventName,
      payload,
      elapsed: timestamp - this.startTime
    };
    
    if (!this.metrics.has(eventName)) {
      this.metrics.set(eventName, []);
    }
    this.metrics.get(eventName).push(entry);
    return entry;
  }

  getMetricsSummary() {
    const summary = {};
    for (const [key, value] of this.metrics.entries()) {
      summary[key] = {
        count: value.length,
        lastExecuted: value[value.length - 1]?.timestamp || null
      };
    }
    return summary;
  }

  clear() {
    this.metrics.clear();
  }
}

export const globalTelemetry = new TelemetryService('CoreEngine');
