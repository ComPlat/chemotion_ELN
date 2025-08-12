import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { describe, it, beforeEach } from 'mocha';
import { Card } from 'react-bootstrap';
import VesselProperties from 'src/apps/mydb/elements/details/vessels/propertiesTab/VesselProperties';
import VesselProperty from 'src/apps/mydb/elements/details/vessels/propertiesTab/VesselProperty';
import UIStore from '../../../../../../../../../../app/javascript/src/stores/alt/stores/UIStore';

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
    UIStore.state.currentCollection = {
      id: 1,
      permission_level: 10,
    };
  });

  describe('when rendered', () => {
    it('renders the Card component', () => {
      const wrapper = shallow(React.createElement(VesselProperties, { ...props }));
      expect(wrapper.find(Card)).toHaveLength(1);
    });

    it('renders one Card body', () => {
      const wrapper = shallow(React.createElement(VesselProperties, { ...props }));
      expect(wrapper.find(Card.Body)).toHaveLength(1);
    });

    it('renders the correct number of VesselProperty components', () => {
      const wrapper = shallow(React.createElement(VesselProperties, { ...props }));
      const vesselProperties = wrapper.find(VesselProperty);
      expect(vesselProperties).toHaveLength(4);
    });

    it('passes the correct props to VesselProperty for "Barcode"', () => {
      const wrapper = shallow(React.createElement(VesselProperties, { ...props }));
      const detailsProp = wrapper.find(VesselProperty).filterWhere((node) => node.prop('label') === 'Barcode');
      expect(detailsProp).toHaveLength(1);
      expect(detailsProp.prop('readOnly')).toBe(true);
    });

    it('renders the correct labels for VesselProperty components', () => {
      const wrapper = shallow(React.createElement(VesselProperties, { ...props }));
      const labels = wrapper.find(VesselProperty).map((prop) => prop.prop('label'));
      expect(labels).toEqual([
        'Vessel Instance Name',
        'Vessel Instance Description',
        'Barcode',
        'QR Code',
      ]);
    });
  });

  describe('when in editable mode', () => {
    it('sets readOnly to false for editable properties', () => {
      const editableProperties = [
        'Vessel Instance Name',
        'Vessel Instance Description',
        'QR Code'
      ];
      props.readOnly = false;
      const wrapper = shallow(React.createElement(VesselProperties, { ...props }));

      editableProperties.forEach((property) => {
        const field = wrapper.findWhere(
          (node) => node.type() === VesselProperty && node.prop('label') === property
        );
        expect(field).toHaveLength(1);
        expect(field.prop('readOnly')).toBe(false);
      });
      const barcodeField = wrapper.findWhere(
        (node) => node.type() === VesselProperty && node.prop('label') === 'Barcode'
      );
      expect(barcodeField.prop('readOnly')).toBe(true);
    });
  });

  describe('when in read-only mode', () => {
    it('sets readOnly to true for all properties', () => {
      const wrapper = shallow(React.createElement(VesselProperties, { ...props }));
      const vesselProperties = wrapper.find(VesselProperty);
      vesselProperties.forEach((property) => {
        expect(property.prop('readOnly')).toBe(true);
      });
    });
  });
});
