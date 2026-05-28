/**
 * Shared mutable state for the local mock printer.
 */

const state = {
  name: process.env.MOCK_PRINTER_NAME ?? "ELEGOO Mock",
  ip: process.env.MOCK_PRINTER_IP ?? "127.0.0.1",
  online: true,
  printerStatusText: "Idle",
  machineStatusCode: 1,
  nozzleTemp: 33,
  nozzleTarget: 0,
  bedTemp: 24,
  bedTarget: 0,
  chamberTemp: 31,
  speedMode: 1,
  lightOn: true,
  fanModelPct: 0,
  fanAuxPct: 38,
  fanBoxPct: 27,
  x: 120,
  y: 130,
  z: 15,
  canvasMode: (process.env.MOCK_CANVAS ?? "multi").toLowerCase(),
};

function clamp(num, min, max) {
  return Math.min(max, Math.max(min, num));
}

export function getMockState() {
  return { ...state };
}

export function updateMockState(patch = {}) {
  if (typeof patch.name === "string" && patch.name.trim()) state.name = patch.name.trim();
  if (typeof patch.ip === "string" && patch.ip.trim()) state.ip = patch.ip.trim();
  if (typeof patch.online === "boolean") state.online = patch.online;
  if (typeof patch.printerStatusText === "string" && patch.printerStatusText.trim()) {
    state.printerStatusText = patch.printerStatusText.trim();
  }
  if (typeof patch.machineStatusCode === "number") state.machineStatusCode = patch.machineStatusCode;
  if (typeof patch.nozzleTemp === "number") state.nozzleTemp = patch.nozzleTemp;
  if (typeof patch.nozzleTarget === "number") state.nozzleTarget = patch.nozzleTarget;
  if (typeof patch.bedTemp === "number") state.bedTemp = patch.bedTemp;
  if (typeof patch.bedTarget === "number") state.bedTarget = patch.bedTarget;
  if (typeof patch.chamberTemp === "number") state.chamberTemp = patch.chamberTemp;
  if (typeof patch.speedMode === "number") state.speedMode = patch.speedMode;
  if (typeof patch.lightOn === "boolean") state.lightOn = patch.lightOn;
  if (typeof patch.fanModelPct === "number") state.fanModelPct = clamp(patch.fanModelPct, 0, 100);
  if (typeof patch.fanAuxPct === "number") state.fanAuxPct = clamp(patch.fanAuxPct, 0, 100);
  if (typeof patch.fanBoxPct === "number") state.fanBoxPct = clamp(patch.fanBoxPct, 0, 100);
  if (typeof patch.x === "number") state.x = patch.x;
  if (typeof patch.y === "number") state.y = patch.y;
  if (typeof patch.z === "number") state.z = patch.z;
  if (typeof patch.canvasMode === "string") {
    const v = patch.canvasMode.toLowerCase();
    if (v === "multi" || v === "mono" || v === "lite") state.canvasMode = v;
  }
  return getMockState();
}
