import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { describe, it, beforeEach } from 'mocha';
import { Button, Tabs, Tab } from 'react-bootstrap';
import VesselDetails from 'src/apps/mydb/elements/details/vessels/VesselDetails';
import VesselProperties from 'src/apps/mydb/elements/details/vessels/propertiesTab/VesselProperties';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIStore from '../../../../../../../../../app/javascript/src/stores/alt/stores/UIStore';

Enzyme.configure({ adapter: new Adapter() });

describe('VesselDetails', () => {
  let props;

  beforeEach(() => {
    props = {
      vesselItem: {
        id: 'vessel123',
        short_label: 'Test Vessel',
        is_new: true,
        adoptPropsFromMobXModel: sinon.spy(),
      },
      toggleFullScreen: sinon.spy(),
    };
    UserStore.state.currentUser = {
      id: 'CU1',
      name: 'Test User 1',
    };
    UIStore.state.currentCollection = {
      id: 1,
      permission_level: 10,
    };
  });

  describe('when vesselItem is null', () => {
    it('does not render the component', () => {
      const wrapper = shallow(
        React.createElement(VesselDetails, {
          vesselItem: null,
          toggleFullScreen: sinon.spy(),
        })
      );
      expect(wrapper.isEmptyRender()).toBe(true);
    });
  });

  describe('when vesselItem is provided', () => {
    it('renders the component', () => {
      const wrapper = shallow(React.createElement(VesselDetails, { ...props }));
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.text()).toContain('Test Vessel');
    });

    it('renders tab for Properties', () => {
      const wrapper = shallow(React.createElement(VesselDetails, { ...props }));
      const tabs = wrapper.find(Tabs);
      expect(tabs).toHaveLength(1);

      const tabProps = tabs.find(Tab);
      expect(tabProps).toHaveLength(1);
      expect(tabProps.at(0).prop('title')).toEqual('Properties');
    });

    it('renders the buttons', () => {
      const wrapper = shallow(React.createElement(VesselDetails, { ...props }));
      const saveButtons = wrapper.find(Button).filterWhere(
        (btn) => btn.prop('variant') === 'warning'
      );
      expect(saveButtons).toHaveLength(3);
    });

    it('renders the fullscreen button', () => {
      const wrapper = shallow(React.createElement(VesselDetails, { ...props }));
      const fullscreenButton = wrapper.find(Button).filterWhere(
        (btn) => btn.prop('variant') === 'info'
      );
      expect(fullscreenButton).toHaveLength(1);
      fullscreenButton.simulate('click');
      expect(props.toggleFullScreen.callCount).toBe(1);
    });
  });

  describe('when the vessel has a new status', () => {
    it('displays the correct button text for creation', () => {
      const wrapper = shallow(React.createElement(VesselDetails, { ...props }));
      const createButton = wrapper.find(Button).filterWhere(
        (btn) => btn.text().includes('Create')
      );

      expect(createButton).toHaveLength(1);
      expect(createButton.prop('variant')).toBe('warning');
    });
  });

  describe('when the vessel has properties', () => {
    it('renders the VesselProperties component', () => {
      const wrapper = shallow(React.createElement(VesselDetails, { ...props }));
      const propertiesTab = wrapper.find(Tab).at(0).find(VesselProperties);
      expect(propertiesTab.exists()).toBe(true);
      expect(propertiesTab.prop('readOnly')).toEqual(expect.any(Boolean));
    });
  });
});
