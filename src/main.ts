import { Abacus } from "./core/abacus";
import { mountAbacus } from "./ui/renderer";
import "./style.css";

const DEFAULT_ROD_COUNT = 7;
const MIN_RODS = 1;
const MAX_RODS = 21;

const mount = document.querySelector<HTMLDivElement>("#abacus-mount");
const rodCountInput = document.querySelector<HTMLInputElement>("#rod-count");
const decrementButton = document.querySelector<HTMLButtonElement>("#rod-count-decrement");
const incrementButton = document.querySelector<HTMLButtonElement>("#rod-count-increment");
const resetButton = document.querySelector<HTMLButtonElement>("#reset-button");

if (!mount || !rodCountInput || !decrementButton || !incrementButton || !resetButton) {
  throw new Error("Required DOM elements not found");
}

function clampRodCount(raw: number): number {
  if (!Number.isFinite(raw)) return DEFAULT_ROD_COUNT;
  return Math.min(MAX_RODS, Math.max(MIN_RODS, Math.round(raw)));
}

let currentAbacus: Abacus | null = null;
let unmountCurrent: (() => void) | null = null;

// A rod-count change never discards work in progress: whatever value was
// already dialed in survives the rebuild (clamped down only if the new,
// smaller rod count genuinely can't hold it). Someone who ran out of rods
// mid-calculation and bumps the count up should see their number still
// sitting there, not a reset abacus.
function rebuild(rodCount: number, preserveValue: bigint): void {
  unmountCurrent?.();
  const abacus = new Abacus(rodCount);
  const maxValue = 10n ** BigInt(rodCount) - 1n;
  abacus.setValue(preserveValue > maxValue ? maxValue : preserveValue);
  currentAbacus = abacus;
  unmountCurrent = mountAbacus(mount!, abacus);
}

function applyRodCount(raw: number): void {
  const clamped = clampRodCount(raw);
  rodCountInput!.value = String(clamped);
  rebuild(clamped, currentAbacus?.getValue() ?? 0n);
}

rodCountInput.min = String(MIN_RODS);
rodCountInput.max = String(MAX_RODS);
rodCountInput.value = String(DEFAULT_ROD_COUNT);
rebuild(DEFAULT_ROD_COUNT, 0n);

// Applies as you type / click — no separate "apply" step.
rodCountInput.addEventListener("input", () => {
  const raw = Number(rodCountInput.value);
  if (!Number.isFinite(raw)) return; // mid-edit empty field etc. — wait for a real number
  applyRodCount(raw);
});

decrementButton.addEventListener("click", () => {
  applyRodCount(clampRodCount(Number(rodCountInput.value)) - 1);
});
incrementButton.addEventListener("click", () => {
  applyRodCount(clampRodCount(Number(rodCountInput.value)) + 1);
});

// The button-and-icon stand-in for the swipe-the-bar gesture: same
// operation, but discoverable without already knowing the real-abacus
// convention.
resetButton.addEventListener("click", () => {
  currentAbacus?.reset();
});
