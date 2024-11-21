import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';

import SpinnerPencilIcon from '../../../app/javascript/src/components/common/SpinnerPencilIcon';

Enzyme.configure({ adapter: new Adapter() });

describe('SpinnerPencilIcon', () => {
  const wrapper = spinningLock => shallow(<SpinnerPencilIcon spinningLock={spinningLock} />);
  it('should be defined', () => {
    expect(<SpinnerPencilIcon spinningLock />).toBeDefined();
    expect(<SpinnerPencilIcon />).toBeDefined();
  });
  it('should toggle the spinner', () => {
  })
});
