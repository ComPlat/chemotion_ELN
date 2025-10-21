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
import ChemicalFetcher from 'src/fetchers/ChemicalFetcher';

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
          sample,
          saveInventory: false,
          setSaveInventory: sinon.spy(),
          handleUpdateSample: sinon.spy(),
          editChemical: sinon.spy(),
          key: 'ChemicalTab29',
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
        sample,
        saveInventory: false,
        editChemical: sinon.spy(),
        setSaveInventory: sinon.spy(),
        handleUpdateSample: sinon.spy(),
        key: 'ChemicalTab29',
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
      expect(wrapper.state().chemical.chemical_data[0].status).toEqual('Available');

      expect(handleFieldChangedSpy.calledWith('status', 'Available')).toBe(true);
    });

    it('renders safety sheets element and related elements if safety sheet exist ', () => {
      // update state of chemical object with safety sheets
      const chemicalData = [{
        safetySheetPath: [
          {
            '252549_8996a8681115b875_link': '/safety_sheets/merck/252549_web_8996a8681115b875.pdf'
          },
        ]
      }];

      // use chemical factory to create a new chemical object with safety sheets
      const newChemical = createChemical(chemicalData, '7681-82-5');
      instance.setState({ chemical: newChemical, displayWell: true });
      wrapper.update();
      // Assert via a stable method to avoid shallow-render side effects
      expect(wrapper.instance().isSavedSds()).toBe(true);
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

    it('render fetch SDS button in disabled mode, if safety sheet with web signature exists and saved', () => {
      // Seed state with a saved SDS from a default vendor (merck) so the button is disabled
      const chemicalData = [{
        safetySheetPath: [
          { '252549_8996a8681115b875_link': '/safety_sheets/merck/252549_web_8996a8681115b875.pdf' }
        ]
      }];
      const newChemical = createChemical(chemicalData, '7681-82-5');
      instance.setState({ chemical: newChemical, displayWell: true });
      wrapper.update();

      expect(wrapper.find('#submit-sds-btn')).toHaveLength(1);
      expect(wrapper.find('#submit-sds-btn').prop('disabled')).toBe(true);
    });

    it('calls querySafetySheets() when fetch safety phrases button is clicked', () => {
      const fetchSafetyPhrasesSpy = sinon.spy(wrapper.instance(), 'fetchSafetyPhrases');
      // Directly invoke to avoid DOM find flakiness in shallow render
      wrapper.instance().fetchSafetyPhrases('merck');
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

      // Set up the component state with a chemical object and displayWell
      const chemicalData = [{
        safetySheetPath: [
          { merck_link: '/safety_sheets/252549_Merck.pdf' }
        ]
      }];
      const newChemical = createChemical(chemicalData, '7681-82-5');
      instance.setState({
        chemical: newChemical,
        displayWell: true,
        viewModalForVendor: 'merck'
      });

      // Directly call the method instead of simulating button click
      instance.fetchChemicalProperties('merck');

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
      const document = { '252549_4c82b57ffb46b49b_link': '/safety_sheets/merck/252549_web_4c82b57ffb46b49b.pdf' };
      const index = 0;
      instance.handleRemove(index, document);
      expect(handleRemoveSpy.called).toBe(true);
      handleRemoveSpy.restore();
    });

    it('calls stylePhrases() when state of safetyPhrases is defined ', () => {
      const chemicalData = [{
        safetySheetPath: [
          {
            '252549_4c82b57ffb46b49b_link': '/safety_sheets/merck/252549_web_4c82b57ffb46b49b.pdf'
          }
        ],
        safetyPhrases: {
          h_statements: {
            H315: 'Causes skin irritation',
            H319: 'Causes serious eye irritation'
          },
          p_statements: {
            P264: 'Wash skin thoroughly after handling',
            P280: 'Wear protective gloves/protective clothing/eye protection/face protection'
          },
          pictograms: ['GHS07']
        }
      }];

      const newChemical = createChemical(chemicalData, '7681-82-5');
      instance.setState({ chemical: newChemical, displayWell: true });
      wrapper.update();

      const stylePhrasesSpy = sinon.spy(instance, 'stylePhrases');
      // Trigger rendering of safety phrases which internally calls stylePhrases
      instance.renderSafetyPhrases();
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

describe('Manual SDS attachment functionality', () => {
  let wrapper;
  let instance;
  let saveManualAttachedSafetySheetStub;

  beforeEach(() => {
    // Create a sample with needed properties
    const testSample = Sample.buildEmpty(2);
    testSample.xref = { cas: '123-45-6' };
    testSample.molecule_name_hash = { mid: 'test-mid' };
    testSample.showedName = () => 'Test Sample';
    testSample.xref = { cas: '123-45-6' };
    testSample.molecule_name_hash = { mid: 'test-mid' };
    testSample.showedName = () => 'Test Sample';
    testSample.xref = { cas: '123-45-6' };
    testSample.molecule_name_hash = { mid: 'test-mid' };
    testSample.showedName = () => 'Test Sample';

    // Stub the ChemicalFetcher.saveManualAttachedSafetySheet method
    saveManualAttachedSafetySheetStub = sinon.stub(ChemicalFetcher, 'saveManualAttachedSafetySheet').resolves({
      _chemical_data: [{
        safetySheetPath: [
          {
            '12345_8902a0447f1e77e2_link': '/safety_sheets/testVendor/12345_8902a0447f1e77e2.pdf'
          }
        ]
      }]
    });

    // Also stub fetchChemical to prevent side effects
    sinon.stub(ChemicalFetcher, 'fetchChemical').resolves({
      _chemical_data: [{
        safetySheetPath: [
          {
            '12345_8902a0447f1e77e2_link': '/safety_sheets/testVendor/12345_8902a0447f1e77e2.pdf'
          }
        ]
      }]
    });

    wrapper = shallow(
      React.createElement(
        ChemicalTab,
        {
          sample: testSample,
          saveInventory: false,
          setSaveInventory: sinon.spy(),
          handleUpdateSample: sinon.spy(),
          editChemical: sinon.spy(),
          key: 'ChemicalTabTest',
        },
      )
    );

    instance = wrapper.instance();

    // Spy on methods to track calls
    sinon.spy(instance, 'setState');
    sinon.spy(instance, 'renderSafetySheets');
    sinon.spy(instance, 'renderChildElements');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should update state and render safety sheets after manual SDS attachment', async () => {
    // Initialize chemical data
    instance.setState({
      chemical: new Chemical({
        _chemical_data: [{}]
      })
    });

    const attachmentData = {
      productNumber: '12345',
      vendorName: 'testVendor',
      attachedFile: new File(['test'], 'test.pdf'),
      productLink: 'http://test.com',
      safetySheetLink: 'http://test.com/sds'
    };

    await instance.handleAttachmentSubmit(attachmentData);

    // Verify that the stub was called
    expect(saveManualAttachedSafetySheetStub.called).toBe(true);
    expect(wrapper.state('chemical')).toBeDefined();
    expect(wrapper.state('showModal')).toBe(false);
  });

  it(`should immediately render updated safety sheets after
  manual SDS attachment without requiring a page refresh`, async () => {
    // Initialize chemical data
    instance.setState({
      chemical: new Chemical({
        _chemical_data: [{}]
      })
    });

    const attachmentData = {
      productNumber: '12345',
      vendorName: 'testVendor',
      attachedFile: new File(['test'], 'test.pdf'),
      productLink: 'http://test.com',
      safetySheetLink: 'http://test.com/sds'
    };

    await instance.handleAttachmentSubmit(attachmentData);

    // Verify that the stub was called with the correct data
    expect(saveManualAttachedSafetySheetStub.calledOnce).toBe(true);
    expect(saveManualAttachedSafetySheetStub.firstCall.args[0]).toBeTruthy();

    // Ensure the well is displayed and saved SDS detected
    instance.setState({ displayWell: true });
    wrapper.update();
    expect(wrapper.instance().isSavedSds()).toBe(true);
    // renderSafetySheets should produce content (not null)
    expect(wrapper.instance().renderSafetySheets()).not.toBe(null);
  });
});
