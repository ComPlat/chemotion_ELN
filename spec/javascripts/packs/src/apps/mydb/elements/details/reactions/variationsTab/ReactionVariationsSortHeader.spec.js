import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import {
  SortableHeaderName
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsSortHeader';

configure({ adapter: new Adapter() });

/*
The grid's custom headers have to ask for the sort themselves - AG Grid only wires click-to-sort
into its own default header. This is the shared piece all three header components use for it.
*/
describe('ReactionVariationsSortHeader', () => {
  const column = {
    getSort: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  it('is a plain label while the column does not sort', () => {
    const wrapper = shallow(
      <SortableHeaderName displayName="Mass" enableSorting={false} />
    );
    expect(wrapper.find('button').length).toBe(0);
    expect(wrapper.text()).toContain('Mass');
  });

  it('sorts the column on click', () => {
    const progressSort = sinon.spy();
    const wrapper = shallow(
      <SortableHeaderName displayName="Mass" column={column} enableSorting progressSort={progressSort} />
    );

    wrapper.find('button').simulate('click', { shiftKey: false });
    expect(progressSort.calledOnceWith(false)).toBe(true);
  });

  it('adds to the sort on shift-click, like the default header', () => {
    const progressSort = sinon.spy();
    const wrapper = shallow(
      <SortableHeaderName displayName="Mass" column={column} enableSorting progressSort={progressSort} />
    );

    wrapper.find('button').simulate('click', { shiftKey: true });
    expect(progressSort.calledOnceWith(true)).toBe(true);
  });
});
