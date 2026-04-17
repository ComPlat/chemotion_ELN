import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { describe, it, beforeEach, afterEach } from 'mocha';

import { Button } from 'react-bootstrap';

import Container from 'src/models/Container';
import Screen from 'src/models/Screen';
import AccordionHeaderWithButtons from 'src/components/common/AccordionHeaderWithButtons';
import AnalysesOrderRow from 'src/apps/mydb/elements/details/analyses/AnalysesOrderRow';
import ScreenDetailsContainers from 'src/apps/mydb/elements/details/screens/analysesTab/ScreenDetailsContainers';

Enzyme.configure({ adapter: new Adapter() });

describe('ScreenDetailsContainers', () => {
  describe('when it does not have any analysis', () => {
    it('renders without any analysis and readonly', () => {
      const screen = Screen.buildEmpty();
      const wrapper = shallow(React.createElement(ScreenDetailsContainers, { screen, readOnly: true, handleScreenChanged: () => {} }));
      expect(wrapper.text()).toEqual(expect.stringContaining('There are currently no Analyses.'));
      expect(wrapper.find(Button)).toHaveLength(0);
    });

    it('renders without any analysis', () => {
      const screen = Screen.buildEmpty();
      const wrapper = shallow(React.createElement(ScreenDetailsContainers, { screen, readOnly: false, handleScreenChanged: () => {} }));
      expect(wrapper.text()).toEqual(expect.stringContaining('There are currently no Analyses.'));
    });
  });

  describe('when it has analyses', () => {
    let screen;

    beforeEach(() => {
      screen = Screen.buildEmpty();
    });

    afterEach(() => {
      screen = null;
    });

    it('renders analyses sorted by index in edit mode', () => {
      const a1 = Container.buildAnalysis('other', 'First');
      a1.extended_metadata.index = 1;
      const a2 = Container.buildAnalysis('other', 'Second');
      a2.extended_metadata.index = 0;
      screen.container.children[0].children.push(a1, a2);

      const wrapper = shallow(
        React.createElement(ScreenDetailsContainers, { screen, readOnly: false, handleScreenChanged: () => {} })
      );

      const headers = wrapper.find(AccordionHeaderWithButtons);
      expect(shallow(headers.at(0).prop('children')).text()).toContain('Second');
      expect(shallow(headers.at(1).prop('children')).text()).toContain('First');
    });

    it('renders AnalysesOrderRow in order mode', () => {
      const analysis = Container.buildAnalysis();
      screen.container.children[0].children.push(analysis);

      const wrapper = shallow(
        React.createElement(ScreenDetailsContainers, { screen, readOnly: false, handleScreenChanged: () => {} })
      );

      wrapper.instance().handleToggleMode('order');
      wrapper.update();

      expect(wrapper.find(AnalysesOrderRow)).toHaveLength(1);
    });

    it('renders analyses sorted by index in order mode', () => {
      const a1 = Container.buildAnalysis('other', 'First');
      a1.extended_metadata.index = 1;
      const a2 = Container.buildAnalysis('other', 'Second');
      a2.extended_metadata.index = 0;
      screen.container.children[0].children.push(a1, a2);

      const wrapper = shallow(
        React.createElement(ScreenDetailsContainers, { screen, readOnly: false, handleScreenChanged: () => {} })
      );

      wrapper.instance().handleToggleMode('order');
      wrapper.update();

      const rows = wrapper.find(AnalysesOrderRow);
      expect(rows.at(0).prop('container').name).toBe('Second');
      expect(rows.at(1).prop('container').name).toBe('First');
    });
  });
});
