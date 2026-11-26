import expect from 'expect';
import fillWells from 'src/apps/mydb/elements/details/wellplates/designerTab/fillWells';

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
