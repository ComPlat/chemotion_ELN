import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import Enzyme, { mount, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { describe, it, beforeEach } from 'mocha';
import { Tabs, Tab } from 'react-bootstrap';
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
        })
      );
      expect(wrapper.isEmptyRender()).toBe(true);
    });
  });

  describe('when vesselItem is provided', () => {
    it('renders the component', () => {
      const wrapper = shallow(React.createElement(VesselDetails, { ...props }));
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.text()).toContain('<DetailCard />');
    });

    it('renders tab for Properties', () => {
      const wrapper = shallow(React.createElement(VesselDetails, { ...props }));
      const tabs = wrapper.find(Tabs);
      expect(tabs).toHaveLength(1);

      const tabProps = tabs.find(Tab);
      expect(tabProps).toHaveLength(1);
      expect(tabProps.at(0).prop('title')).toEqual('Properties');
    });

    it('renders primary action and Close buttons in the card footer', () => {
      const wrapper = mount(
        <VesselDetails
          vesselItem={props.vesselItem}
        />
      );
      const footer = wrapper.find('.card-footer');
      expect(footer.exists()).toBe(true);
      expect(footer.find('button').filterWhere(
        (btn) => btn.hasClass('btn-primary')
      )).toHaveLength(1);

      expect(footer.find('button').filterWhere((btn) => btn.text().includes('Close'))).toHaveLength(1);
    });
  });

  describe('when the vessel has a new status', () => {
    it('displays the correct button text for creation', () => {
      const wrapper = mount(
        <VesselDetails
          vesselItem={props.vesselItem}
        />
      );

      expect(wrapper.find('.card-footer').find('button').filterWhere(
        (btn) => btn.text().includes('Create')
      )).toHaveLength(1);
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
