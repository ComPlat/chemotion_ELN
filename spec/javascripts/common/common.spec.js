import React from 'react';
import expect from 'expect';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';

import SpinnerPencilIcon from '../../../app/javascript/src/components/common/SpinnerPencilIcon';

configure({ adapter: new Adapter() });

describe('SpinnerPencilIcon', () => {
  const wrapper = (spinningLock) => shallow(
    React.createElement(SpinnerPencilIcon, { spinningLock })
  );
  it('should be defined', () => {
    expect(wrapper()).toBeDefined();
    expect(wrapper(null)).toBeDefined();
  });
  it('should toggle the spinner', () => {
    const spinningLock = true;
    const wrapperTrue = wrapper(spinningLock);
    expect(wrapperTrue.find('.fa-spinner').length).toBe(1);
    const spinningLockFalse = false;
    const wrapperFalse = wrapper(spinningLockFalse);
    expect(wrapperFalse.find('.fa-spinner').length).toBe(0);
  });
});
