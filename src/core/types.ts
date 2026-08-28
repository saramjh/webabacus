export interface RodState {
  /** 윗알(5)이 활성화되어 있는지 여부 */
  heaven: boolean;
  /** 활성화된 아랫알(1씩) 개수, 0-4 */
  earth: number;
}

export class InvalidRodCountError extends Error {
  constructor(rodCount: number) {
    super(`rodCount must be a positive integer, got ${rodCount}`);
    this.name = "InvalidRodCountError";
  }
}

export class InvalidRodIndexError extends Error {
  constructor(rodIndex: number, rodCount: number) {
    super(`rodIndex ${rodIndex} is out of range for rodCount ${rodCount}`);
    this.name = "InvalidRodIndexError";
  }
}

export class InvalidBeadStateError extends Error {
  constructor(earth: number) {
    super(`earth bead count must be an integer between 0 and 4, got ${earth}`);
    this.name = "InvalidBeadStateError";
  }
}

export class AbacusOverflowError extends Error {
  constructor(value: bigint, maxValue: bigint) {
    super(`value ${value} exceeds the maximum representable value ${maxValue}`);
    this.name = "AbacusOverflowError";
  }
}

export class AbacusUnderflowError extends Error {
  constructor(value: bigint) {
    super(`value ${value} is negative, which is not representable`);
    this.name = "AbacusUnderflowError";
  }
}
