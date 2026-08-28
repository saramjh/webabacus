import { describe, expect, it, vi } from "vitest";
import { Abacus } from "./abacus";
import {
  AbacusOverflowError,
  AbacusUnderflowError,
  InvalidBeadStateError,
  InvalidRodCountError,
  InvalidRodIndexError,
} from "./types";

describe("Abacus construction", () => {
  it("starts at zero", () => {
    expect(new Abacus(5).getValue()).toBe(0n);
  });

  it("rejects a non-positive rod count", () => {
    expect(() => new Abacus(0)).toThrow(InvalidRodCountError);
    expect(() => new Abacus(-3)).toThrow(InvalidRodCountError);
  });

  it("rejects a non-integer rod count", () => {
    expect(() => new Abacus(2.5)).toThrow(InvalidRodCountError);
  });
});

describe("setValue / getValue round-trip", () => {
  it("round-trips a typical value", () => {
    const abacus = new Abacus(5);
    abacus.setValue(12345n);
    expect(abacus.getValue()).toBe(12345n);
  });

  it("round-trips the maximum representable value", () => {
    const abacus = new Abacus(3);
    abacus.setValue(999n);
    expect(abacus.getValue()).toBe(999n);
  });

  it("accepts plain numbers too", () => {
    const abacus = new Abacus(4);
    abacus.setValue(42);
    expect(abacus.getValue()).toBe(42n);
  });

  it("throws AbacusOverflowError beyond capacity", () => {
    const abacus = new Abacus(3);
    expect(() => abacus.setValue(1000n)).toThrow(AbacusOverflowError);
  });

  it("throws AbacusUnderflowError for a negative value", () => {
    const abacus = new Abacus(3);
    expect(() => abacus.setValue(-1n)).toThrow(AbacusUnderflowError);
  });
});

describe("toggleHeaven", () => {
  it("changes the value by exactly 5 at the correct place value", () => {
    const abacus = new Abacus(3);
    abacus.toggleHeaven(1); // middle rod (10s place)
    expect(abacus.getValue()).toBe(50n);
    abacus.toggleHeaven(1);
    expect(abacus.getValue()).toBe(0n);
  });

  it("throws InvalidRodIndexError for an out-of-range index", () => {
    const abacus = new Abacus(3);
    expect(() => abacus.toggleHeaven(-1)).toThrow(InvalidRodIndexError);
    expect(() => abacus.toggleHeaven(3)).toThrow(InvalidRodIndexError);
  });
});

describe("setEarth", () => {
  it("rejects out-of-range earth counts", () => {
    const abacus = new Abacus(3);
    expect(() => abacus.setEarth(0, -1)).toThrow(InvalidBeadStateError);
    expect(() => abacus.setEarth(0, 5)).toThrow(InvalidBeadStateError);
  });

  it("rejects non-integer earth counts", () => {
    const abacus = new Abacus(3);
    expect(() => abacus.setEarth(0, 1.5)).toThrow(InvalidBeadStateError);
  });

  it("throws InvalidRodIndexError for an out-of-range rod index", () => {
    const abacus = new Abacus(3);
    expect(() => abacus.setEarth(5, 2)).toThrow(InvalidRodIndexError);
  });

  it("sets the digit correctly", () => {
    const abacus = new Abacus(2);
    abacus.setEarth(1, 3);
    expect(abacus.getValue()).toBe(3n);
  });
});

describe("add", () => {
  it("carries into the next rod", () => {
    const abacus = new Abacus(3);
    abacus.setValue(8n);
    abacus.add(5n);
    expect(abacus.getValue()).toBe(13n);
    const rods = abacus.getRods();
    expect(rods[1]).toEqual({ heaven: false, earth: 1 }); // tens digit = 1
    expect(rods[2]).toEqual({ heaven: false, earth: 3 }); // ones digit = 3
  });

  it("throws AbacusOverflowError beyond capacity", () => {
    const abacus = new Abacus(2);
    abacus.setValue(95n);
    expect(() => abacus.add(10n)).toThrow(AbacusOverflowError);
  });
});

describe("subtract", () => {
  it("borrows across rods", () => {
    const abacus = new Abacus(3);
    abacus.setValue(100n);
    abacus.subtract(1n);
    expect(abacus.getValue()).toBe(99n);
  });

  it("throws AbacusUnderflowError when the result would be negative", () => {
    const abacus = new Abacus(3);
    abacus.setValue(5n);
    expect(() => abacus.subtract(10n)).toThrow(AbacusUnderflowError);
  });
});

describe("reset", () => {
  it("returns the value to zero", () => {
    const abacus = new Abacus(4);
    abacus.setValue(1234n);
    abacus.reset();
    expect(abacus.getValue()).toBe(0n);
  });
});

describe("onChange", () => {
  it("fires exactly once per mutating call with the updated state", () => {
    const abacus = new Abacus(2);
    const listener = vi.fn();
    abacus.onChange(listener);

    abacus.setValue(42n);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(abacus.getRods());

    abacus.toggleHeaven(0);
    expect(listener).toHaveBeenCalledTimes(2);

    abacus.setEarth(1, 0);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("stops firing after unsubscribe", () => {
    const abacus = new Abacus(2);
    const listener = vi.fn();
    const unsubscribe = abacus.onChange(listener);
    unsubscribe();

    abacus.setValue(10n);
    expect(listener).not.toHaveBeenCalled();
  });

  it("does not fire when a mutating call throws validation errors", () => {
    const abacus = new Abacus(2);
    const listener = vi.fn();
    abacus.onChange(listener);

    expect(() => abacus.setValue(1000n)).toThrow(AbacusOverflowError);
    expect(listener).not.toHaveBeenCalled();
  });
});
