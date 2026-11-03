import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { act } from 'react-dom/test-utils';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ReactionFactory from 'factories/ReactionFactory';
import { reactionSvgPath } from 'src/models/Reaction';
import ReactionSvgFetcher from 'src/fetchers/ReactionSvgFetcher';
import ReactionSchemeGraphic from 'src/apps/mydb/elements/details/reactions/ReactionSchemeGraphic';
import { makeVariationReaction } from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

configure({ adapter: new Adapter() });

// The SVG viewer parses what it shows; jsdom has the parser on its window only.
global.DOMParser = global.DOMParser || window.DOMParser;

const REACTION_SVG = '<svg xmlns="http://www.w3.org/2000/svg"><text>reaction</text></svg>';
const VARIATION_SVG = '<svg xmlns="http://www.w3.org/2000/svg"><text>variation</text></svg>';

describe('reactionSvgPath', () => {
  it('shows raw SVG as a data URI, a file from /images/reactions, and a placeholder otherwise', () => {
    expect(reactionSvgPath(REACTION_SVG).startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(reactionSvgPath('abc.svg')).toBe('/images/reactions/abc.svg');
    expect(reactionSvgPath('')).toBe('images/wild_card/no_image_180.svg');
    expect(reactionSvgPath('***')).toBe('images/wild_card/no_image_180.svg');
  });
});

/*
The reaction graphic draws the scheme of the reaction or, picked in its dropdown, of one of its
variations - fetched for that variation and kept in the graphic, not stored anywhere.
*/
describe('ReactionSchemeGraphic - scheme of a variation', () => {
  let reaction;
  let variations;
  let fetch;

  const render = (props = {}) => mount(
    <ReactionSchemeGraphic reaction={reaction} onToggleLabel={() => {}} {...props} />
  );
  const shownSvg = (wrapper) => wrapper.find('SvgFileZoomPan').prop('svgPath');
  const settle = async (wrapper) => {
    await act(async () => { await Promise.resolve(); });
    wrapper.update();
  };

  beforeEach(async () => {
    reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.reaction_svg_file = REACTION_SVG;
    variations = [
      { idx: 0, label: 1, data: makeVariationReaction(reaction, { id: 'variation-1' }) },
      { idx: 1, label: 2, data: makeVariationReaction(reaction, { id: 'variation-2' }) },
    ];
    fetch = sinon.stub(ReactionSvgFetcher, 'fetchByReaction').resolves({ reaction_svg: VARIATION_SVG });
  });

  afterEach(() => {
    fetch.restore();
  });

  it('offers no choice without variations', () => {
    const wrapper = render();
    expect(wrapper.find('select').exists()).toBe(false);
    expect(fetch.called).toBe(false);
    wrapper.unmount();
  });

  it('offers the reaction and each variation, and reports the choice', () => {
    const onSelectVariation = sinon.spy();
    const wrapper = render({ variations, onSelectVariation });
    const options = wrapper.find('option').map((option) => option.text());
    expect(options).toEqual(['Reaction', 'Variation #1', 'Variation #2']);

    wrapper.find('select').simulate('change', { target: { value: 'variation-2' } });
    expect(onSelectVariation.lastCall.args).toEqual(['variation-2']);
    wrapper.find('select').simulate('change', { target: { value: '' } });
    expect(onSelectVariation.lastCall.args).toEqual([null]);
    wrapper.unmount();
  });

  it('draws the scheme of the variation picked, and stores it nowhere', async () => {
    const wrapper = render({ variations, selectedVariationId: 'variation-2' });
    await settle(wrapper);

    expect(fetch.calledOnceWith(variations[1].data)).toBe(true);
    expect(shownSvg(wrapper)).toBe(reactionSvgPath(VARIATION_SVG));
    expect(reaction.reaction_svg_file).toBe(REACTION_SVG);
    expect(variations[1].data.reaction_svg_file).toBe(REACTION_SVG);
    wrapper.unmount();
  });

  it('shows the reaction\'s own scheme for a variation that is gone', async () => {
    const wrapper = render({ variations, selectedVariationId: 'removed' });
    await settle(wrapper);

    expect(fetch.called).toBe(false);
    expect(shownSvg(wrapper)).toBe(reaction.svgPath);
    wrapper.unmount();
  });
});
