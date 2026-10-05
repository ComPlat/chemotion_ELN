import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import {
  SortableHeaderName, sortTitle
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

  // Clicks go ascending, descending, then back to no sort; the title says which comes next.
  describe('title', () => {
    it('offers the ascending sort on an unsorted column', () => {
      expect(sortTitle('Mass', null)).toContain('Click to sort by Mass, ascending');
    });

    it('offers the descending sort on an ascending one', () => {
      expect(sortTitle('Mass', 'asc')).toContain('Click to sort descending');
    });

    it('says the next click removes the sort and restores the variations\' own order', () => {
      expect(sortTitle('Mass', 'desc')).toContain('Click to remove the sort');
      expect(sortTitle('Mass', 'desc')).toContain('their own order');
    });
  });
});
