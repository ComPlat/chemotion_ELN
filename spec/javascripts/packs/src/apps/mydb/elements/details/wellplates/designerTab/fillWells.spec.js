import expect from 'expect';
import fillWells, { wellsInLine, clearWells } from 'src/apps/mydb/elements/details/wellplates/designerTab/fillWells';

describe('fillWells', () => {
  let wells;
  let count;
  let sample;

  const at = (list, x, y) => list.find((w) => w.position.x === x && w.position.y === y);

  beforeEach(() => {
    wells = [1, 2, 3].flatMap((y) => [1, 2].map((x) => ({ position: { x, y } })));
    count = 0;
    sample = { buildChild: () => { count += 1; return { n: count }; } };
  });

  it('fills every empty well in row 2', () => {
    const result = fillWells(wells, sample, 'y', 2);
    expect(at(result, 1, 2).sample).toEqual({ n: 1 });
    expect(at(result, 2, 2).sample).toEqual({ n: 2 });
    expect(result.filter((w) => w.sample).length).toEqual(2);
  });

  it('fills every empty well in column 1', () => {
    const result = fillWells(wells, sample, 'x', 1);
    expect([1, 2, 3].map((y) => at(result, 1, y).sample)).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
    expect(result.filter((w) => w.sample).length).toEqual(3);
  });

  it('numbers splits in grid order when the array is shuffled', () => {
    const result = fillWells([...wells].reverse(), sample, 'y', 2);
    expect(at(result, 1, 2).sample).toEqual({ n: 1 });
    expect(at(result, 2, 2).sample).toEqual({ n: 2 });
  });

  it('keeps wells that already have a sample', () => {
    at(wells, 1, 2).sample = { keep: true };
    const result = fillWells(wells, sample, 'y', 2);
    expect(at(result, 1, 2).sample).toEqual({ keep: true });
    expect(count).toEqual(1);
  });

  it('does nothing when the row is full', () => {
    at(wells, 1, 2).sample = { keep: true };
    at(wells, 2, 2).sample = { keep: true };
    fillWells(wells, sample, 'y', 2);
    expect(count).toEqual(0);
  });

  it('does not mutate the input array', () => {
    const result = fillWells(wells, sample, 'y', 2);
    expect(result).not.toBe(wells);
    expect(wells.filter((w) => w.sample).length).toEqual(0);
  });
});

describe('wellsInLine', () => {
  const wells = [1, 2, 3].flatMap((y) => [1, 2].map((x) => ({ position: { x, y } })));

  it('returns the wells of a row or a column', () => {
    expect(wellsInLine(wells, 'y', 2).map((w) => w.position)).toEqual([{ x: 1, y: 2 }, { x: 2, y: 2 }]);
    expect(wellsInLine(wells, 'x', 1).length).toEqual(3);
  });
});

describe('clearWells', () => {
  let wells;

  beforeEach(() => {
    wells = [1, 2, 3].flatMap((y) => [1, 2].map((x) => ({ position: { x, y } })));
    wells.filter((w) => w.position.y === 2).forEach((w) => { w.sample = { keep: true }; });
    wells.find((w) => w.position.x === 1 && w.position.y === 2).readouts = [1];
  });

  it('removes the samples of the row and keeps the rest of each well', () => {
    const result = clearWells(wells, 'y', 2);
    const row = result.filter((w) => w.position.y === 2);
    expect(row.map((w) => w.sample)).toEqual([null, null]);
    expect(row[0].readouts).toEqual([1]);
    expect(result[0]).toBe(wells[0]);
  });

  it('does not mutate the input array', () => {
    clearWells(wells, 'y', 2);
    expect(wells.filter((w) => w.sample).length).toEqual(2);
  });
});
