import React from 'react';
import expect from 'expect';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ReactionFactory from 'factories/ReactionFactory';
import ReactionVariations, {
  viewLabel
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariations';

configure({ adapter: new Adapter() });

// The view picker of the variations toolbar names the scheme as the tab it mirrors is named.
describe('ReactionVariations viewLabel', () => {
  it('names the scheme view "Scheme"', () => {
    expect(viewLabel('Schema')).toBe('Scheme');
  });

  it('names a segment view after its segment klass', () => {
    expect(viewLabel('Purification')).toBe('Purification');
  });
});

// Variations can be added before the reaction is created; the tab says they are saved along with it.
describe('ReactionVariations notice on a reaction not created yet', () => {
  const noticeShown = async (isNew) => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.isNew = isNew;
    reaction.variations = [];
    const wrapper = shallow(
      <ReactionVariations
        reaction={reaction}
        variations={[]}
        setVariations={() => {}}
        onReactionChange={() => {}}
      />
    );
    return wrapper.find('[data-testid="unsaved-reaction-notice"]').exists();
  };

  it('is shown while the reaction has not been created', async () => {
    expect(await noticeShown(true)).toBe(true);
  });

  it('is gone once it has', async () => {
    expect(await noticeShown(false)).toBe(false);
  });
});
