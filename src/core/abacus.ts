import {
  AbacusOverflowError,
  AbacusUnderflowError,
  InvalidBeadStateError,
  InvalidRodCountError,
  InvalidRodIndexError,
  type RodState,
} from "./types";

function digitOf(rod: RodState): number {
  return (rod.heaven ? 5 : 0) + rod.earth;
}

function digitsFromValue(value: bigint, rodCount: number): number[] {
  const digits: number[] = new Array(rodCount).fill(0);
  let remaining = value;
  for (let i = rodCount - 1; i >= 0; i--) {
    digits[i] = Number(remaining % 10n);
    remaining /= 10n;
  }
  return digits;
}

/**
 * Pure, DOM-agnostic abacus (1 heaven bead + 4 earth beads per rod).
 * Rod index 0 is the most significant (leftmost) digit.
 */
export class Abacus {
  private readonly rodCount: number;
  private readonly maxValue: bigint;
  private rods: RodState[];
  private readonly listeners = new Set<(rods: ReadonlyArray<RodState>) => void>();

  constructor(rodCount: number) {
    if (!Number.isInteger(rodCount) || rodCount < 1) {
      throw new InvalidRodCountError(rodCount);
    }
    this.rodCount = rodCount;
    this.maxValue = 10n ** BigInt(rodCount) - 1n;
    this.rods = Array.from({ length: rodCount }, () => ({ heaven: false, earth: 0 }));
  }

  getRodCount(): number {
    return this.rodCount;
  }

  getRods(): ReadonlyArray<RodState> {
    return this.rods.map((rod) => ({ ...rod }));
  }

  getValue(): bigint {
    let value = 0n;
    for (const rod of this.rods) {
      value = value * 10n + BigInt(digitOf(rod));
    }
    return value;
  }

  setValue(value: bigint | number): void {
    const v = typeof value === "number" ? BigInt(value) : value;
    if (v < 0n) {
      throw new AbacusUnderflowError(v);
    }
    if (v > this.maxValue) {
      throw new AbacusOverflowError(v, this.maxValue);
    }
    const digits = digitsFromValue(v, this.rodCount);
    this.rods = digits.map((digit) => ({ heaven: digit >= 5, earth: digit % 5 }));
    this.notifyChange();
  }

  toggleHeaven(rodIndex: number): void {
    this.assertValidRodIndex(rodIndex);
    const rod = this.rods[rodIndex];
    this.rods[rodIndex] = { ...rod, heaven: !rod.heaven };
    this.notifyChange();
  }

  setEarth(rodIndex: number, count: number): void {
    this.assertValidRodIndex(rodIndex);
    if (!Number.isInteger(count) || count < 0 || count > 4) {
      throw new InvalidBeadStateError(count);
    }
    const rod = this.rods[rodIndex];
    this.rods[rodIndex] = { ...rod, earth: count };
    this.notifyChange();
  }

  add(n: bigint | number): void {
    const delta = typeof n === "number" ? BigInt(n) : n;
    this.setValue(this.getValue() + delta);
  }

  subtract(n: bigint | number): void {
    const delta = typeof n === "number" ? BigInt(n) : n;
    this.setValue(this.getValue() - delta);
  }

  reset(): void {
    this.setValue(0n);
  }

  onChange(listener: (rods: ReadonlyArray<RodState>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private assertValidRodIndex(rodIndex: number): void {
    if (!Number.isInteger(rodIndex) || rodIndex < 0 || rodIndex >= this.rodCount) {
      throw new InvalidRodIndexError(rodIndex, this.rodCount);
    }
  }

  private notifyChange(): void {
    const snapshot = this.getRods();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
