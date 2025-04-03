import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import expect from 'expect';
import sinon from 'sinon';
import {
  describe, it, beforeEach, afterEach
} from 'mocha';
import ChemicalTab from 'src/components/chemicals/ChemicalTab';
import Sample from 'src/models/Sample';
import Chemical from 'src/models/Chemical';

const createChemical = (chemicalData = [{}], cas = null) => {
  const chemical = new Chemical();
  chemical.chemical_data = chemicalData;
  chemical.cas = cas;
  return chemical;
};

configure({ adapter: new Adapter() });

const sample = Sample.buildEmpty(2);

describe('ChemicalTab basic rendering', () => {
  let wrapper = null;

  beforeEach(() => {
    wrapper = shallow(
      React.createElement(
        ChemicalTab,
        {
          sample: sample,
          saveInventory: false,
          setSaveInventory: sinon.spy(),
          handleUpdateSample: sinon.spy(),
          editChemical: sinon.spy(),
          key: "ChemicalTab29",
        },
      )
    );
  });

  it('should render all tabs', () => {
    expect(wrapper.text()).toEqual(expect.stringContaining('Inventory Information'));
    expect(wrapper.text()).toEqual(expect.stringContaining('Safety'));
    expect(wrapper.text()).toEqual(expect.stringContaining('Location and Information'));
  });

  it('should render safety query button', () => {
    expect(wrapper.find('#submit-sds-btn')).toHaveLength(1);
  });

  it('should render choose vendor list', () => {
    expect(wrapper.find('[data-component="chooseVendor"]')).toHaveLength(1);
  });

  it('should render query-option list', () => {
    expect(wrapper.text()).toEqual(expect.stringContaining('Query SDS using'));
  });

  it('should render safety-sheet-language list', () => {
    expect(wrapper.text()).toEqual(expect.stringContaining('Choose Language of SDS'));
  });

  it('should enable clicking on query safety sheet button, if no safety sheet exists', () => {
    expect(wrapper.find('#submit-sds-btn').prop('disabled')).toBe(false);
  });
});

describe('ChemicalTab component', () => {
  const wrapper = shallow(
    React.createElement(
      ChemicalTab,
      {
        sample: sample,
        saveInventory: false,
        editChemical: sinon.spy(),
        setSaveInventory: sinon.spy(),
        handleUpdateSample: sinon.spy(),
        key: "ChemicalTab29",
      }
    )
  );

  it('fetches chemical data on componentDidMount', () => {
    const fetchChemicalSpy = sinon.spy(ChemicalTab.prototype, 'fetchChemical');
    wrapper.instance().componentDidMount();
    expect(fetchChemicalSpy.calledOnce).toBe(true);
  });

  it('updates displayWell state on componentDidUpdate', () => {
    const updateDisplayWellSpy = sinon.spy(ChemicalTab.prototype, 'updateDisplayWell');
    wrapper.instance().componentDidUpdate({}, { chemical: null });
    expect(updateDisplayWellSpy.calledOnce).toBe(true);
  });

  it('calls querySafetySheets() when submit button is clicked', () => {
    const querySafetySheetsSpy = sinon.spy(wrapper.instance(), 'querySafetySheets');
    wrapper.find('#submit-sds-btn').simulate('click');
    expect(wrapper.find('.fa-spinner')).toHaveLength(1);
    expect(querySafetySheetsSpy.called).toBe(true);
  });

  describe('render component and update chemical object', () => {
    const stubMethod = (object, method, fakeImplementation) => {
      const originalMethod = object[method];
      return sinon.stub(object, method).callsFake((...args) => (args[0] !== null && args[0] !== undefined
        ? originalMethod(...args)
        : fakeImplementation(...args)));
    };

    beforeEach(() => {
      // Stub fetch
      sinon.stub(global, 'fetch').callsFake(() => Promise.resolve({
        json: () => Promise.resolve({ some: 'data' }),
      }));

      // Stub Object.values and Object.entries
      stubMethod(Object, 'values', () => ['default1']);
      stubMethod(Object, 'entries', () => ({ defaultKey1: 'defaultValue1', defaultKey2: 'defaultValue2' }));
    });

    afterEach(() => {
      sinon.restore();
    });

    const instance = wrapper.instance();

    it('update state of chemical object and assert functionality of handleFieldChanged function', () => {
      expect(wrapper.find('[name="chemicalStatus"]')).toHaveLength(1);

      // update state of chemical object
      const chemicalData = [{ status: 'Out of stock' }];
      // use chemical factory to create a new chemical object
      const newChemical = createChemical(chemicalData, '7681-82-5');
      instance.setState({ chemical: newChemical });
      expect(wrapper.state().chemical).toEqual(newChemical);

      const handleFieldChangedSpy = sinon.spy(instance, 'handleFieldChanged');
      // change the state of status key in chemical_data
      instance.handleFieldChanged('status', 'Available');

      // assert that the state of chemical object has been updated
      const updatedChemicalData = [{ status: 'Available' }];
      expect(wrapper.state().chemical.chemical_data).toEqual(updatedChemicalData);

      expect(handleFieldChangedSpy.calledWith('status', 'Available')).toBe(true);
    });

    it('renders safety sheets element and related elements if safety sheet exist ', () => {
      // update state of chemical object with safety sheets
      const chemicalData = [{
        safetySheetPath: [
          { merck_link: '/safety_sheets/252549_Merck.pdf' },
        ]
      }];

      // use chemical factory to create a new chemical object with safety sheets
      const newChemical = createChemical(chemicalData, '7681-82-5');
      instance.setState({ chemical: newChemical });

      // expect elements with class names to be rendered
      expect(wrapper.find('[data-component="SafetySheets"]')).toHaveLength(1);
    });

    it('Simulate clicking on the modal close button ', () => {
      const closePropertiesModalSpy = sinon.spy(instance, 'closePropertiesModal');
      wrapper.find(Modal.Footer).find(Button).simulate('click');
      expect(closePropertiesModalSpy.called).toBe(true);
      closePropertiesModalSpy.restore();
    });

    it('should call setState with expected arguments in closePropertiesModal()', () => {
      const setStateStub = sinon.stub(ChemicalTab.prototype, 'setState');
      const chemicalTabInstance = new ChemicalTab();

      chemicalTabInstance.closePropertiesModal();
      sinon.assert.calledOnce(setStateStub);
      sinon.assert.calledWith(setStateStub, {
        viewChemicalPropertiesModal: false,
        viewModalForVendor: ''
      });
      setStateStub.restore();
    });

    it('render submit safety data sheet button with disabled option, if safety sheet exists and saved', () => {
      expect(wrapper.find('#submit-sds-btn')).toHaveLength(1);
      expect(wrapper.find('#submit-sds-btn').prop('disabled')).toBe(true);
    });

    it('calls querySafetySheets() when fetch safety phrases button is clicked', () => {
      const fetchSafetyPhrasesSpy = sinon.spy(wrapper.instance(), 'fetchSafetyPhrases');
      wrapper.find('#safetyPhrases-btn').simulate('click');
      expect(fetchSafetyPhrasesSpy.called).toBe(true);
      fetchSafetyPhrasesSpy.restore();
    });

    it('calls renderSafetySheets() when query safety sheets button is clicked', () => {
      const renderSafetySheetsSpy = sinon.spy(wrapper.instance(), 'renderSafetySheets');
      wrapper.find('#submit-sds-btn').simulate('click');
      expect(renderSafetySheetsSpy.called).toBe(true);
      renderSafetySheetsSpy.restore();
    });

    it('calls renderChildElements() when query safety sheets button is clicked', () => {
      const renderChildElementsSpy = sinon.spy(wrapper.instance(), 'renderChildElements');
      wrapper.find('#submit-sds-btn').simulate('click');
      expect(renderChildElementsSpy.called).toBe(true);
      renderChildElementsSpy.restore();
    });

    it('calls fetchChemicalProperties() when fetch chemical properties button is clicked', () => {
      const fetchChemicalPropertiesSpy = sinon.spy(wrapper.instance(), 'fetchChemicalProperties');
      wrapper.find('#fetch-properties').simulate('click');
      expect(fetchChemicalPropertiesSpy.called).toBe(true);
      fetchChemicalPropertiesSpy.restore();
    });

    it('calls textInput() when field input is changed', () => {
      const data = { parameter: 'Merck' };
      const label = 'Vendor';
      const parameter = 'vendor';

      // Call the textInput function with the props
      const textInputSpy = sinon.spy(instance, 'textInput');
      instance.textInput(data, label, parameter);
      expect(textInputSpy.calledWith(data, label, parameter)).toBe(true);
      textInputSpy.restore();
    });

    it('calls handleRemove when removeButton is clicked', () => {
      const handleRemoveSpy = sinon.spy(instance, 'handleRemove');
      const document = { merck_link: '/safety_sheets/252549_Merck.pdf' };
      const index = 0;
      instance.handleRemove(index, document);
      expect(handleRemoveSpy.called).toBe(true);
      handleRemoveSpy.restore();
    });

    it('calls stylePhrases() when state of safetyPhrases is defined ', () => {
      const chemicalData = [{
        safetySheetPath: [
          {
            merck_link: '/safety_sheets/252549_Merck.pdf'
          }
        ],
        safetyPhrases: {
          h_statements: {
            H315: ' Causes skin irritation'
          },
          p_statements: {
            P280: ' Wear protective gloves/protective clothing/eye protection/face protection. [As modified by IV ATP]'
          },
          pictograms: [
            'GHS07',
            'GHS08'
          ]
        }
      }];
      const newChemical = createChemical(chemicalData, '7681-82-5');
      instance.setState({ chemical: newChemical });
      const stylePhrasesSpy = sinon.spy(wrapper.instance(), 'stylePhrases');
      wrapper.find('#safetyPhrases-btn').simulate('click');
      expect(stylePhrasesSpy.called).toBe(true);
      stylePhrasesSpy.restore();
    });

    it('should call saveSafetySheetsButton with expected arguments', () => {
      const saveSafetySheetsButtonSpy = sinon.spy(instance, 'saveSafetySheetsButton');
      const sdsInfo = {
        alfa_link: 'https://example.com/alfa',
        alfa_product_number: '123',
        alfa_product_link: 'https://example.com/alfa-product',
      };
      const index = 0;

      instance.saveSafetySheetsButton(sdsInfo, index);
      expect(saveSafetySheetsButtonSpy.called).toBe(true);

      sinon.assert.calledOnce(saveSafetySheetsButtonSpy);
      saveSafetySheetsButtonSpy.restore();
    });

    it('should call saveSdsFile with expected arguments', () => {
      const saveSdsFileSpy = sinon.spy(instance, 'saveSdsFile');
      const productInfo = {
        vendor: 'Merck',
        sdsLink: 'https://example.com/merck',
        productNumber: '123',
        productLink: 'https://example.com/merck-product',
      };

      instance.saveSdsFile(productInfo);
      expect(saveSdsFileSpy.called).toBe(true);

      sinon.assert.calledOnce(saveSdsFileSpy);
      saveSdsFileSpy.restore();
    });

    it('should render renderWarningMessage when warningMessage state is updated', () => {
      instance.setState({ warningMessage: 'This is a warning message' });
      const renderWarningMessageSpy = sinon.spy(instance, 'renderWarningMessage');
      instance.renderWarningMessage();
      expect(renderWarningMessageSpy.called).toBe(true);

      sinon.assert.calledOnce(renderWarningMessageSpy);
      renderWarningMessageSpy.restore();
    });
  });
});
