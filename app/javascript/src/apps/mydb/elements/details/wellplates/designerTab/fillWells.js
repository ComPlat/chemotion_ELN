export default function fillWells(wells, sample, axis, index) {
  const otherAxis = axis === 'x' ? 'y' : 'x';
  const filled = new Map(
    wells
      .filter((well) => well.position[axis] === index && !well.sample)
      .sort((a, b) => a.position[otherAxis] - b.position[otherAxis])
      .map((well) => [well, { ...well, sample: sample.buildChild() }])
  );
  return wells.map((well) => filled.get(well) || well);
}
