import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { describe, it, beforeEach, afterEach } from 'mocha';
import { Button, Tabs, Tab } from 'react-bootstrap';
import VesselDetails from 'src/apps/mydb/elements/details/vessels/VesselDetails';
import VesselProperties from 'src/apps/mydb/elements/details/vessels/propertiesTab/VesselProperties';
import VesselAttachmentsContainer from 'src/apps/mydb/elements/details/vessels/attachmentsTab/VesselAttachmentsContainer';

Enzyme.configure({ adapter: new Adapter() });

describe('VesselDetails', () => {
  let props;

  beforeEach(() => {
    props = {
      vesselItem: {
        id: 'vessel123',
        short_label: 'Test Vessel',
        is_new: true,
        adoptPropsFromMobXModel: jest.fn(),
      },
      toggleFullScreen: jest.fn(),
    };
  });

  describe('when vesselItem is null', () => {
    it('does not render the component', () => {
      const wrapper = shallow(<VesselDetails vesselItem={null} toggleFullScreen={jest.fn()} />);
      expect(wrapper.isEmptyRender()).toBe(true);
    });
  });

  describe('when vesselItem is provided', () => {
    it('renders the component', () => {
      const wrapper = shallow(<VesselDetails {...props} />);
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.text()).toContain('Test Vessel');
    });

    it('renders tabs for Properties and Attachments', () => {
      const wrapper = shallow(<VesselDetails {...props} />);
      const tabs = wrapper.find(Tabs);
      expect(tabs).toHaveLength(1);

      const tabProps = tabs.find(Tab);
      expect(tabProps).toHaveLength(2);
      expect(tabProps.at(0).prop('title')).toEqual('Properties');
      expect(tabProps.at(1).prop('title')).toEqual('Attachments');
    });

    it('renders the "Save" and "Save and Close" buttons', () => {
      const wrapper = shallow(<VesselDetails {...props} />);
      const saveButtons = wrapper.find(Button).filterWhere(
        (btn) => btn.prop('variant') === 'warning'
      );
      expect(saveButtons).toHaveLength(2);
    });

    it('renders the fullscreen button', () => {
      const wrapper = shallow(<VesselDetails {...props} />);
      const fullscreenButton = wrapper.find(Button).filterWhere(
        (btn) => btn.prop('variant') === 'info'
      );
      expect(fullscreenButton).toHaveLength(1);
      fullscreenButton.simulate('click');
      expect(props.toggleFullScreen).toHaveBeenCalledTimes(1);
    });
  });

  describe('when tabs are switched', () => {
    it('updates the active tab', () => {
      const wrapper = shallow(<VesselDetails {...props} />);
      wrapper.find(Tabs).simulate('select', 'tab2');
      expect(wrapper.find(Tabs).prop('activeKey')).toEqual('tab2');
    });
  });

  describe('when the close button is clicked', () => {
    it('renders and triggers the handleClose function', () => {
      const mockHandleClose = jest.fn();
      const wrapper = shallow(<VesselDetails {...props} />);
      const closeButton = wrapper.find(Button).filterWhere(
        (btn) => btn.prop('variant') === 'danger'
      );
      expect(closeButton).toHaveLength(1);
      closeButton.simulate('click');
    });
  });

  describe('when the vessel has a new status', () => {
    it('displays the correct button text for creation', () => {
      const wrapper = shallow(<VesselDetails {...props} />);
      const submitButton = wrapper.find(Button).filterWhere(
        (btn) => btn.prop('variant') === 'warning'
      );
      expect(submitButton.first().text()).toContain('Create');
    });
  });

  describe('when the vessel has attachments', () => {
    it('renders the VesselAttachmentsContainer', () => {
      const wrapper = shallow(<VesselDetails {...props} />);
      const attachmentsTab = wrapper.find(Tab).at(1).find(VesselAttachmentsContainer);
      expect(attachmentsTab.exists()).toBe(true);
    });
  });

  describe('when the vessel has properties', () => {
    it('renders the VesselProperties component', () => {
      const wrapper = shallow(<VesselDetails {...props} />);
      const propertiesTab = wrapper.find(Tab).at(0).find(VesselProperties);
      expect(propertiesTab.exists()).toBe(true);
      expect(propertiesTab.prop('readOnly')).toEqual(expect.any(Boolean));
    });
  });
});
