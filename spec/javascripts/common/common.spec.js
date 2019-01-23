import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import sinon from 'sinon';

import SpinnerPencilIcon from '../../../app/assets/javascripts/components/common/SpinnerPencilIcon';

Enzyme.configure({ adapter: new Adapter() });

describe('SpinnerPencilIcon', () => {
  const wrapper = spinningLock => shallow(<SpinnerPencilIcon  spinningLock={spinningLock} />);
  it('should be defined', () => {
    expect(<SpinnerPencilIcon spinningLock />).toBeDefined();
    expect(<SpinnerPencilIcon />).toBeDefined();
  });
  it('should toggle the spinner', () => {
  })
});
