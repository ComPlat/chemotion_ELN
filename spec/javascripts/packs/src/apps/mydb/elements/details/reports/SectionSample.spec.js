import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { AnalysesContent } from 'src/apps/mydb/elements/details/reports/SectionSample';

Enzyme.configure({ adapter: new Adapter() });

// Shallow render executes AnalysesContent's body — including analysesParagraph() — but
// leaves QuillViewer unmounted, so we exercise the exact code path that crashed the
// Label/Preview tab without pulling in the editor internals.
const render = (props) => shallow(React.createElement(AnalysesContent, props));

describe('SectionSample AnalysesContent', () => {
  // Regression ComPlat/chemotion_ELN#3169: the Label/Preview tab crashed with
  // "Cannot read properties of undefined (reading 'map')" when a sample had zero
  // analyses and the reaction_description object had no usable .ops array.
  it('does not crash with zero analyses and a reaction_description missing .ops', () => {
    const rd = {}; // object without .ops
    expect(() => render({
      show: true, showRecDes: rd, analyses: [], reactionDescription: rd,
    })).not.toThrow();
  });

  it('does not crash when reaction_description.ops is a non-array', () => {
    const rd = { ops: {} };
    expect(() => render({
      show: true, showRecDes: rd, analyses: [], reactionDescription: rd,
    })).not.toThrow();
  });

  it('does not crash when an analysis content has a non-array ops', () => {
    expect(() => render({
      show: true,
      showRecDes: false,
      analyses: [{ extended_metadata: { content: { ops: {} } } }],
      reactionDescription: null,
    })).not.toThrow();
  });

  it('merges reaction_description ops with analysis ops and strips newlines', () => {
    const rd = { ops: [{ insert: 'desc\n' }] };
    const wrapper = render({
      show: true,
      showRecDes: rd,
      analyses: [{ extended_metadata: { content: { ops: [{ insert: 'a\nb' }] } } }],
      reactionDescription: rd,
    });

    expect(wrapper.find('QuillViewer').prop('value')).toEqual({
      ops: [{ insert: 'desc ' }, { insert: 'a b' }],
    });
  });

  it('renders nothing when show is falsy', () => {
    const wrapper = render({
      show: false, showRecDes: false, analyses: [], reactionDescription: null,
    });

    expect(wrapper.isEmptyRender()).toBe(true);
  });
});
