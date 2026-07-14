import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { describe, it, beforeEach, afterEach } from 'mocha';

import Container from 'src/models/Container';
import Sample from 'src/models/Sample';
import { ReactionsDisplay, RndNoAnalyses } from 'src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainersCom';
import SampleDetailsContainers from 'src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainers';

Enzyme.configure({ adapter: new Adapter() });

describe('SampleDetailsContainers', () => {
  describe('when it does not have any analysis', () => {
    it('renders no analyses message', () => {
      const sample = Sample.buildEmpty();
      const wrapper = shallow(
        React.createElement(SampleDetailsContainers, { sample, readOnly: true, handleSampleChanged: () => {} })
      );
      expect(wrapper.find(RndNoAnalyses)).toHaveLength(1);
    });
  });

  describe('when it has analyses', () => {
    let sample;

    beforeEach(() => {
      sample = Sample.buildEmpty();
    });

    afterEach(() => {
      sample = null;
    });

    it('passes analyses sorted by index to ReactionsDisplay', () => {
      const a1 = Container.buildAnalysis('other', 'First');
      a1.extended_metadata.index = 1;
      const a2 = Container.buildAnalysis('other', 'Second');
      a2.extended_metadata.index = 0;
      sample.container.children[0].children.push(a1, a2);

      const wrapper = shallow(
        React.createElement(SampleDetailsContainers, { sample, readOnly: false, handleSampleChanged: () => {} })
      );

      const display = wrapper.find(ReactionsDisplay);
      const orderContainers = display.prop('orderContainers');
      expect(orderContainers[0].name).toBe('Second');
      expect(orderContainers[1].name).toBe('First');
    });

    it('passes correct mode to ReactionsDisplay', () => {
      const analysis = Container.buildAnalysis();
      sample.container.children[0].children.push(analysis);

      const wrapper = shallow(
        React.createElement(SampleDetailsContainers, { sample, readOnly: false, handleSampleChanged: () => {} })
      );

      expect(wrapper.find(ReactionsDisplay).prop('mode')).toBe('edit');

      wrapper.instance().handleToggleMode('order');
      wrapper.update();

      expect(wrapper.find(ReactionsDisplay).prop('mode')).toBe('order');
    });
  });
});
