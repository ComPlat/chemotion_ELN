import expect from 'expect';
import { viewLabel } from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariations';

// The view picker of the variations toolbar names the scheme as the tab it mirrors is named.
describe('ReactionVariations viewLabel', () => {
  it('names the scheme view "Scheme"', () => {
    expect(viewLabel('Schema')).toBe('Scheme');
  });

  it('names a segment view after its segment klass', () => {
    expect(viewLabel('Purification')).toBe('Purification');
  });
});
