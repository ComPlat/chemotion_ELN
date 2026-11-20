import { describe, it } from 'mocha';
import expect from 'expect';

import { listLayoutFor } from 'src/utilities/ListLayoutHelper';

describe('listLayoutFor', () => {
  const profile = { sample: 1, reaction: 2, cell_line: -1 };

  it('uses the profile layout when the collection has none', () => {
    expect(listLayoutFor(null, profile)).toEqual(profile);
    expect(listLayoutFor({ list_layout: {} }, profile)).toEqual(profile);
  });

  it('uses the collection layout and hides elements it does not list', () => {
    const collection = { list_layout: { cell_line: 1, sample: 2 } };
    expect(listLayoutFor(collection, profile)).toEqual({ sample: 2, reaction: -1000, cell_line: 1 });
  });

  it('reads a layout sent as text', () => {
    const collection = { list_layout: '{"reaction": 1}' };
    expect(listLayoutFor(collection, profile)).toEqual({ sample: -1000, reaction: 1, cell_line: -1000 });
  });

  it('ignores elements the profile no longer has', () => {
    const collection = { list_layout: { removed_generic: 1, sample: 2 } };
    expect(listLayoutFor(collection, profile)).toEqual({ sample: 2, reaction: -1000, cell_line: -1000 });
  });

  it('falls back to the profile when the collection would show nothing', () => {
    expect(listLayoutFor({ list_layout: { removed_generic: 1 } }, profile)).toEqual(profile);
    expect(listLayoutFor({ list_layout: 'not json' }, profile)).toEqual(profile);
  });
});
