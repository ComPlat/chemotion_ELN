import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { describe, it, beforeEach } from 'mocha';
import { Accordion } from 'react-bootstrap';
import VesselProperties from 'src/apps/mydb/elements/details/vessels/propertiesTab/VesselProperties';
import VesselProperty from 'src/apps/mydb/elements/details/vessels/propertiesTab/VesselProperty';
import VesselName from 'src/apps/mydb/elements/details/vessels/propertiesTab/VesselName';

Enzyme.configure({ adapter: new Adapter() });

describe('VesselProperties', () => {
  let props;

  beforeEach(() => {
    props = {
      readOnly: true,
      item: {
        id: 'vessel123',
      },
    };
  });

  describe('when rendered', () => {
    it('renders the Accordion component', () => {
      const wrapper = shallow(<VesselProperties {...props} />);
      expect(wrapper.find(Accordion)).toHaveLength(1);
    });

    it('renders two Accordion items', () => {
      const wrapper = shallow(<VesselProperties {...props} />);
      const accordionItems = wrapper.find(Accordion.Item);
      expect(accordionItems).toHaveLength(2);
    });

    it('renders the VesselName component', () => {
      const wrapper = shallow(<VesselProperties {...props} />);
      const vesselName = wrapper.find(VesselName);
      expect(vesselName).toHaveLength(1);
      expect(vesselName.prop('readOnly')).toBe(true);
    });

    it('renders the correct number of VesselProperty components', () => {
      const wrapper = shallow(<VesselProperties {...props} />);
      const vesselProperties = wrapper.find(VesselProperty);
      expect(vesselProperties).toHaveLength(12);
    });

    it('passes the correct props to VesselProperty for "Details"', () => {
      const wrapper = shallow(<VesselProperties {...props} />);
      const detailsProp = wrapper.find(VesselProperty).filterWhere((prop) => prop.prop('label') === 'Details');
      expect(detailsProp).toHaveLength(1);
      expect(detailsProp.prop('optional')).toBe(true);
    });

    it('renders the correct labels for VesselProperty components', () => {
      const wrapper = shallow(<VesselProperties {...props} />);
      const labels = wrapper.find(VesselProperty).map((prop) => prop.prop('label'));
      expect(labels).toEqual([
        'Details',
        'Material type',
        'Vessel type',
        'Volume amount',
        'Volume unit',
        'Weight amount',
        'Weight unit',
        'Vessel instance name',
        'Vessel instance description',
        'Barcode',
        'QR Code',
      ]);
    });
  });

  describe('when in editable mode', () => {
    it('sets readOnly to false for editable properties', () => {
      props.readOnly = false;
      const wrapper = shallow(<VesselProperties {...props} />);
      const vesselProperties = wrapper.find(VesselProperty);
      vesselProperties.forEach((property) => {
        expect(property.prop('readOnly')).toBe(false);
      });
    });
  });

  describe('when in read-only mode', () => {
    it('sets readOnly to true for all properties', () => {
      const wrapper = shallow(<VesselProperties {...props} />);
      const vesselProperties = wrapper.find(VesselProperty);
      vesselProperties.forEach((property) => {
        expect(property.prop('readOnly')).toBe(true);
      });
    });
  });
});
