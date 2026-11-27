export const wellsInLine = (wells, axis, index) => wells.filter((well) => well.position[axis] === index);

export const clearWells = (wells, axis, index) => wells.map((well) => (
  well.position[axis] === index && well.sample ? { ...well, sample: null } : well
));

export default function fillWells(wells, sample, axis, index) {
  const otherAxis = axis === 'x' ? 'y' : 'x';
  const filled = new Map(
    wellsInLine(wells, axis, index)
      .filter((well) => !well.sample)
      .sort((a, b) => a.position[otherAxis] - b.position[otherAxis])
      .map((well) => [well, { ...well, sample: sample.buildChild() }])
  );
  return wells.map((well) => filled.get(well) || well);
}
