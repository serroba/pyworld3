export type RawLookupTable = {
  sector: string;
  "x.name": string;
  "x.values": number[];
  "y.name": string;
  "y.values": number[];
};

export type LookupTable = {
  sector: string;
  xName: string;
  xValues: number[];
  yName: string;
  yValues: number[];
};

export type LookupInterpolator = {
  table: LookupTable;
  evaluate: (x: number) => number;
};

export function normalizeLookupTable(rawTable: RawLookupTable): LookupTable {
  if (rawTable["x.values"].length === 0 || rawTable["y.values"].length === 0) {
    throw new Error(`Lookup table '${rawTable["y.name"]}' cannot be empty`);
  }
  if (rawTable["x.values"].length !== rawTable["y.values"].length) {
    throw new Error(
      `Lookup table '${rawTable["y.name"]}' must have matching x/y lengths`,
    );
  }

  return {
    sector: rawTable.sector,
    xName: rawTable["x.name"],
    xValues: [...rawTable["x.values"]],
    yName: rawTable["y.name"],
    yValues: [...rawTable["y.values"]],
  };
}

export function evaluateLookupTable(table: LookupTable, x: number): number {
  const { xValues, yValues } = table;
  const firstX = xValues[0];
  const lastX = xValues[xValues.length - 1];
  const firstY = yValues[0];
  const lastY = yValues[yValues.length - 1];

  if (
    firstX === undefined ||
    lastX === undefined ||
    firstY === undefined ||
    lastY === undefined
  ) {
    throw new Error(`Lookup table '${table.yName}' is not initialized`);
  }

  if (x <= firstX) {
    return firstY;
  }
  if (x >= lastX) {
    return lastY;
  }

  for (let index = 0; index < xValues.length - 1; index += 1) {
    const leftX = xValues[index];
    const rightX = xValues[index + 1];
    const leftY = yValues[index];
    const rightY = yValues[index + 1];

    if (
      leftX === undefined ||
      rightX === undefined ||
      leftY === undefined ||
      rightY === undefined
    ) {
      continue;
    }

    if (x <= rightX) {
      const ratio = (x - leftX) / (rightX - leftX);
      return leftY + ratio * (rightY - leftY);
    }
  }

  return lastY;
}

export function createLookupInterpolator(table: LookupTable): LookupInterpolator {
  return {
    table,
    evaluate: (x) => evaluateLookupTable(table, x),
  };
}

export function createLookupLibrary(
  rawTables: RawLookupTable[],
): Map<string, LookupInterpolator> {
  const library = new Map<string, LookupInterpolator>();
  for (const rawTable of rawTables) {
    const table = normalizeLookupTable(rawTable);
    library.set(table.yName, createLookupInterpolator(table));
  }
  return library;
}
