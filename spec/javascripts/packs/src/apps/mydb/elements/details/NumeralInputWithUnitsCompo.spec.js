import React from 'react';
import { Form } from 'react-bootstrap';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import expect from 'expect';
import { debounce } from 'lodash';
import sinon from 'sinon';

import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';

configure({ adapter: new Adapter() });

describe('NumeralInputWithUnitsCompo', () => {
  it('commits the latest typed value on blur without queuing the stale prop value', () => {
    const clock = sinon.useFakeTimers();
    const commit = sinon.spy();
    const debouncedOnChange = debounce(commit, 500);
    const wrapper = shallow(
      <NumeralInputWithUnitsCompo
        value={0.006}
        unit="g"
        metricPrefix="m"
        metricPrefixes={['m']}
        precision={4}
        onChange={debouncedOnChange}
        onBlur={() => debouncedOnChange.flush()}
      />
    );

    try {
      wrapper.find(Form.Control).simulate('change', {
        target: {
          value: '63',
          selectionStart: 2,
          focus: sinon.spy(),
        },
      });

      // Blur before the debounce expires. The old model value represents the
      // first digit (6 mg), while the latest local input is 63 mg.
      wrapper.find(Form.Control).simulate('blur');

      expect(commit.calledOnce).toBe(true);
      expect(commit.firstCall.args[0].value).toBeCloseTo(0.063);

      // No delayed callback may replay the stale 6 mg prop after the flush.
      clock.tick(500);
      expect(commit.calledOnce).toBe(true);
      expect(commit.lastCall.args[0].value).toBeCloseTo(0.063);
    } finally {
      debouncedOnChange.cancel();
      wrapper.unmount();
      clock.restore();
    }
  });
});
