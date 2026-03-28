import { describe, expect, test } from "vitest";

import {
  Delay3,
  Dlinf3,
  Smooth,
  createSeriesBuffer,
  createTimeGrid,
} from "../ts/core/index.ts";

describe("runtime primitives", () => {
  test("creates a deterministic time grid", () => {
    expect(Array.from(createTimeGrid(1900, 1901, 0.5))).toEqual([
      1900,
      1900.5,
      1901,
    ]);
  });

  test("rejects invalid time grid inputs", () => {
    expect(() => createTimeGrid(1901, 1900, 0.5)).toThrow(
      "yearMax must be greater than or equal to yearMin",
    );
    expect(() => createTimeGrid(1900, 1901, 0)).toThrow(
      "dt must be greater than zero",
    );
  });

  test("allocates float64 series buffers", () => {
    const buffer = createSeriesBuffer(4);
    expect(buffer).toBeInstanceOf(Float64Array);
    expect(buffer.length).toBe(4);
  });

  test("matches the Euler smooth update sequence", () => {
    const smooth = new Smooth([10, 20, 30], 1);

    expect(smooth.step(0, 2)).toBe(10);
    expect(smooth.step(1, 2)).toBe(10);
    expect(smooth.step(2, 2)).toBe(15);
  });

  test("matches the Euler third-order delay sequence", () => {
    const delay = new Delay3([9, 9, 9], 1);

    expect(delay.step(0, 3)).toBe(9);
    expect(delay.step(1, 3)).toBe(9);
    expect(delay.step(2, 3)).toBe(9);
  });

  test("matches the third-order information delay initialization", () => {
    const delay = new Dlinf3([4, 10, 16, 16, 16], 1);

    expect(delay.step(0, 3)).toBe(4);
    expect(delay.step(1, 3)).toBe(4);
    expect(delay.step(2, 3)).toBe(4);
    expect(delay.step(3, 3)).toBe(4);
    expect(delay.step(4, 3)).toBeCloseTo(10, 6);
  });
});
