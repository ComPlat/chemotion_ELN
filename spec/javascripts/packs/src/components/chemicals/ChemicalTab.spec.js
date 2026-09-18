import React from 'react';
import { Button, OverlayTrigger } from 'react-bootstrap';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import expect from 'expect';
import sinon from 'sinon';
import ChemicalTab from 'src/components/chemicals/ChemicalTab';
import Sample from 'src/models/Sample';
import Chemical from 'src/models/Chemical';
import ChemicalFetcher from 'src/fetchers/ChemicalFetcher';
import AppModal from 'src/components/common/AppModal';
import SafetyPhrasesEditor from 'src/components/chemicals/SafetyPhrasesEditor';

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
          type: 'sample',
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
        type: 'sample',
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
    // The button refuses to search with an empty CAS, so give it one.
    const value = sinon.stub(wrapper.instance(), 'queryValueFor').returns('7732-18-5');
    wrapper.find('#submit-sds-btn').simulate('click');
    value.restore();
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
      expect(wrapper.instance().renderSafetySheets()).not.toBe(null);
    });

    it('Simulate clicking on the modal close button ', () => {
      const closePropertiesModalSpy = sinon.spy(instance, 'closePropertiesModal');
      wrapper.find(AppModal).prop('onHide')();
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
        viewPropertiesForSheet: ''
      });
      setStateStub.restore();
    });

    const savedSheets = (count) => Array.from({ length: count }, (_, i) => ({
      [`25254${i}_8996a8681115b87${i}_link`]: `/safety_sheets/merck/25254${i}_web_8996a8681115b87${i}.pdf`
    }));

    it('keeps the SDS search enabled once sheets are already saved', () => {
      const newChemical = createChemical([{ safetySheetPath: savedSheets(1) }], '7681-82-5');
      instance.setState({ chemical: newChemical, displayWell: true });
      wrapper.update();

      expect(wrapper.find('#submit-sds-btn')).toHaveLength(1);
      expect(wrapper.find('#submit-sds-btn').prop('disabled')).toBe(false);
    });

    it('keeps the SDS search enabled at the saved-sheet limit', () => {
      const newChemical = createChemical([{ safetySheetPath: savedSheets(5) }], '7681-82-5');
      instance.setState({ chemical: newChemical, displayWell: true });
      wrapper.update();

      expect(instance.atSavedSdsLimit()).toBe(true);
      expect(wrapper.find('#submit-sds-btn').prop('disabled')).toBe(false);
    });

    it('reports the limit instead of saving a sixth sheet', () => {
      const newChemical = createChemical([{ safetySheetPath: savedSheets(5) }], '7681-82-5');
      instance.setState({ chemical: newChemical, displayWell: true });
      // Stubbed, not spied: the real one needs the notifications context.
      const notify = sinon.stub(instance, 'notifySavedSdsLimit');
      const browser = sinon.spy(instance, 'fetchSdsInBrowser');
      const server = sinon.spy(instance, 'fetchSdsOnServer');

      return instance
        .saveSdsViaRoutes(['browser', 'server'], { productNumber: '1', sdsLink: 'x', vendor: 'Merck' }, 'merck')
        .then(() => {
          expect(notify.called).toBe(true);
          expect(browser.called).toBe(false);
          expect(server.called).toBe(false);
          notify.restore();
          browser.restore();
          server.restore();
        });
    });

    it('starts every sheet section open and folds it on toggle', () => {
      ['sdsVendors', 'catalogueVendors', 'searchResults', 'savedSds'].forEach((id) => {
        expect(instance.isSectionOpen(id)).toBe(true);
        instance.toggleSection(id);
        expect(instance.isSectionOpen(id)).toBe(false);
        instance.toggleSection(id);
        expect(instance.isSectionOpen(id)).toBe(true);
      });
    });

    it('folds one section without folding the others', () => {
      instance.toggleSection('savedSds');
      expect(instance.isSectionOpen('savedSds')).toBe(false);
      expect(instance.isSectionOpen('searchResults')).toBe(true);
      instance.toggleSection('savedSds');
    });

    describe('vendorFromDocument', () => {
      it('reads the vendor out of a stored sheet path', () => {
        expect(ChemicalTab.vendorFromDocument({
          '252549_8996a8681115b875_link': '/safety_sheets/merck/252549_web_8996a8681115b875.pdf'
        })).toEqual('merck');
      });

      it('falls back to the link key for a search result', () => {
        expect(ChemicalTab.vendorFromDocument({
          merck_link: 'https://www.sigmaaldrich.com/DE/en/sds/sigald/179124'
        })).toEqual('merck');
        expect(ChemicalTab.vendorFromDocument({
          fisher_link: 'https://www.fishersci.com/store/msds?partNumber=AC327840025'
        })).toEqual('fisher');
      });

      it('yields nothing rather than throwing on an unusable document', () => {
        expect(ChemicalTab.vendorFromDocument({})).toEqual('');
        expect(ChemicalTab.vendorFromDocument(undefined)).toEqual('');
      });
    });

    it('removes a search result without throwing on its vendor URL', () => {
      const found = {
        merck_link: 'https://www.sigmaaldrich.com/DE/en/sds/sigald/179124',
        merck_product_number: '179124'
      };
      instance.setState({
        chemical: createChemical([{ safetySheetPath: [] }], '7681-82-5'),
        searchResults: [found],
        displayWell: true
      });

      expect(() => instance.handleRemove(0, found)).not.toThrow();
      expect(wrapper.state().searchResults).toEqual([]);
    });

    describe('empty query values', () => {
      // Stubbed rather than spied: the real one needs the notifications context.
      const withNotifications = () => sinon.stub(instance, 'notifyMissingQueryValue');

      it('reads the value the chosen option searches on', () => {
        instance.setState({
          chemical: createChemical([{ product_number: '179124' }], '7681-82-5')
        });
        expect(instance.queryValueFor('Product Number')).toEqual('179124');
        expect(instance.queryValueFor('CAS')).toEqual('');
      });

      it('notifies and sends no request when the option has no value', () => {
        const add = withNotifications();
        const fetchSpy = sinon.stub(ChemicalFetcher, 'fetchSafetySheets').resolves('{}');
        instance.setState({
          chemical: createChemical([{}], null),
          queryOption: 'Product Number'
        });

        instance.querySafetySheets();

        expect(add.called).toBe(true);
        expect(fetchSpy.called).toBe(false);
        expect(wrapper.state().loadingQuerySafetySheets).toBe(false);
        add.restore();
        fetchSpy.restore();
      });

      it('names the option that has nothing to search with', () => {
        const add = withNotifications();
        const fetchSpy = sinon.stub(ChemicalFetcher, 'fetchSafetySheets').resolves('{}');
        instance.setState({ chemical: createChemical([{}], null), queryOption: 'CAS' });

        instance.querySafetySheets();

        expect(add.firstCall.args[0]).toEqual('CAS');
        expect(fetchSpy.called).toBe(false);
        add.restore();
        fetchSpy.restore();
      });
    });

    describe('safety phrases section', () => {
      it('counts an absent or wholly empty set as empty', () => {
        instance.setState({ chemical: createChemical([{}], '7681-82-5') });
        expect(instance.safetyPhrasesEmpty()).toBe(true);

        instance.setState({
          chemical: createChemical([{ safetyPhrases: { h_statements: {}, p_statements: {}, pictograms: [] } }])
        });
        expect(instance.safetyPhrasesEmpty()).toBe(true);
      });

      it('is not empty once any one of the three carries a value', () => {
        instance.setState({
          chemical: createChemical([{ safetyPhrases: { h_statements: { H200: 'x' } } }])
        });
        expect(instance.safetyPhrasesEmpty()).toBe(false);

        instance.setState({
          chemical: createChemical([{ safetyPhrases: { pictograms: ['GHS02'] } }])
        });
        expect(instance.safetyPhrasesEmpty()).toBe(false);
      });

      it('starts folded when empty and open when populated', () => {
        instance.setState({ chemical: createChemical([{}], '7681-82-5') });
        expect(instance.isSectionOpen('safetyPhrases', !instance.safetyPhrasesEmpty())).toBe(false);

        instance.setState({
          chemical: createChemical([{ safetyPhrases: { pictograms: ['GHS02'] } }])
        });
        expect(instance.isSectionOpen('safetyPhrases', !instance.safetyPhrasesEmpty())).toBe(true);
      });

      it('still opens on an explicit toggle while empty', () => {
        instance.setState({ chemical: createChemical([{}], '7681-82-5'), collapsedSections: {} });
        instance.toggleSection('safetyPhrases', false);
        expect(instance.isSectionOpen('safetyPhrases', false)).toBe(true);
        instance.setState({ collapsedSections: {} });
      });
    });

    describe('product number search', () => {
      // PubChem is reached by the molecule, so the sample needs an identifier of its own.
      before(() => { sample.xref = { ...sample.xref, cas: '7732-18-5' }; });
      after(() => { delete sample.xref.cas; });

      const searchWith = (vendorValue) => {
        const fetchSpy = sinon.stub(ChemicalFetcher, 'fetchSafetySheets').resolves('{}');
        instance.setState({
          vendorValue,
          queryOption: 'Product Number',
          chemical: createChemical([{ product_number: '179124' }], '7681-82-5')
        });
        instance.querySafetySheets();
        const args = fetchSpy.firstCall?.args?.[0];
        fetchSpy.restore();
        return args;
      };

      it('goes to the vendor lookup for every vendor option, not just Sigma', () => {
        ['Merck', 'Thermofisher', 'All'].forEach((vendorValue) => {
          const args = searchWith(vendorValue);
          expect(args).not.toBeUndefined();
          expect(args.vendor).toEqual(vendorValue);
          expect(args.productNumber).toEqual('179124');
        });
      });

      it('sends the molecule identifier, since PubChem is reached by the molecule', () => {
        const args = searchWith('All');
        expect(args.string).toEqual('7732-18-5');
      });

      it('carries no product number for the other options', () => {
        const fetchSpy = sinon.stub(ChemicalFetcher, 'fetchSafetySheets').resolves('{}');
        instance.setState({ vendorValue: 'All', queryOption: 'CAS' });
        const value = sinon.stub(instance, 'queryValueFor').returns('7732-18-5');
        instance.querySafetySheets();
        expect(fetchSpy.firstCall.args[0].productNumber).toBeNull();
        value.restore();
        fetchSpy.restore();
      });
    });

    describe('copyProductNumber', () => {
      it('marks the badge copied, then lets it settle back', () => {
        const clock = sinon.useFakeTimers();
        const write = sinon.stub().resolves();
        global.navigator.clipboard = { writeText: write };

        return instance.copyProductNumber('179124').then(() => {
          expect(write.calledWith('179124')).toBe(true);
          expect(wrapper.state().copyFeedback).toEqual({ value: '179124', ok: true });
          clock.tick(2000);
          expect(wrapper.state().copyFeedback).toBeNull();
          clock.restore();
        });
      });

      it('shows a failed copy on the badge and raises no notification', () => {
        const notify = sinon.stub(instance, 'notify');
        global.navigator.clipboard = undefined;

        return instance.copyProductNumber('179124').then(() => {
          expect(wrapper.state().copyFeedback).toEqual({ value: '179124', ok: false });
          expect(notify.called).toBe(false);
          notify.restore();
          instance.setState({ copyFeedback: null });
        });
      });

      it('renders its tooltip into the body, clear of the scrolling list', () => {
        const group = {
          vendor: 'Sigma-Aldrich',
          products: [{ merck_link: 'x', merck_product_number: '179124' }]
        };
        instance.setState({ expandedProducts: {}, copyFeedback: null });

        const trigger = shallow(instance.renderVendorProducts(group)).find(OverlayTrigger).first();
        expect(trigger.prop('container')()).toBe(document.body);
        expect(trigger.prop('overlay').props.children).toEqual(expect.stringContaining('Click to copy'));
      });

      it('keeps saying what a click does, copied or not', () => {
        expect(ChemicalTab.copyTooltip('Sigma-Aldrich'))
          .toEqual('Sigma-Aldrich catalogue number. Click to copy.');
        expect(ChemicalTab.copyTooltip(null)).toEqual('Product listing. Click to copy.');
      });
    });

    describe('the empty state and vendor messages', () => {
      const emptyChemical = () => createChemical([{ safetySheetPath: [] }], '7681-82-5');

      it('stays quiet while vendor groups are on screen', () => {
        instance.setState({
          chemical: emptyChemical(),
          displayWell: true,
          searchResults: [],
          vendorOverview: { sds_vendors: [{ vendor: 'Sigma-Aldrich', products: [] }], catalogue_vendors: [] }
        });
        expect(instance.renderSafetySheets().props['data-empty']).toBeUndefined();
      });

      it('reports no sheets when there is genuinely nothing', () => {
        instance.setState({
          chemical: emptyChemical(), displayWell: true, searchResults: [], vendorOverview: null
        });
        expect(instance.renderSafetySheets().props['data-empty']).toEqual('true');
      });

      it('shows an all-vendors miss as the same line, not a red warning', () => {
        instance.setState({
          chemical: emptyChemical(),
          displayWell: true,
          searchResults: ['No safety data sheet found from any vendor'],
          vendorOverview: null,
          warningMessage: ''
        });
        const text = shallow(instance.renderSafetySheets()).text();
        expect(text).toEqual(expect.stringContaining('No safety data sheet found from any vendor'));
        expect(wrapper.state().warningMessage).toEqual('');
        instance.setState({ searchResults: [] });
      });

      it('renders a vendor message as a line, not a sheet row', () => {
        instance.setState({
          chemical: emptyChemical(),
          displayWell: true,
          searchResults: ['No safety data sheet found from Sigma-Aldrich'],
          vendorOverview: null
        });
        const text = shallow(instance.renderSafetySheets()).text();
        expect(text).toEqual(expect.stringContaining('No safety data sheet found from Sigma-Aldrich'));
        instance.setState({ searchResults: [] });
      });
    });

    describe('section counters', () => {
      const headerOf = (args) => shallow(instance.sectionHeader('anId', 'A title', args));

      it('explains a counter on hover when it has something to explain', () => {
        const header = headerOf({ meta: '2 of 5', metaTooltip: 'A sample holds at most 5.' });
        const tip = header.find(OverlayTrigger);
        expect(tip).toHaveLength(1);
        expect(tip.prop('overlay').props.children).toEqual('A sample holds at most 5.');
      });

      it('shows a bare counter when there is nothing to explain', () => {
        expect(headerOf({ meta: '2 of 5' }).find(OverlayTrigger)).toHaveLength(0);
        expect(headerOf({ meta: '2 of 5' }).text()).toEqual(expect.stringContaining('2 of 5'));
      });

      it('renders no counter at all without one', () => {
        expect(headerOf({}).find('span')).toHaveLength(0);
      });
    });

    it('stays below the limit for four saved sheets', () => {
      const newChemical = createChemical([{ safetySheetPath: savedSheets(4) }], '7681-82-5');
      instance.setState({ chemical: newChemical, displayWell: true });
      expect(instance.atSavedSdsLimit()).toBe(false);
    });

    it('leaves the extract button disabled for a sheet that is not saved yet', () => {
      const button = shallow(
        <div>{wrapper.instance().renderSdsExtraction('https://vendor.example/sheet.pdf')}</div>
      ).find('#extract-sds');
      expect(button.prop('disabled')).toBe(true);
    });

    it('calls renderSafetySheets() when query safety sheets button is clicked', () => {
      const renderSafetySheetsSpy = sinon.spy(wrapper.instance(), 'renderSafetySheets');
      const value = sinon.stub(wrapper.instance(), 'queryValueFor').returns('7732-18-5');
      wrapper.find('#submit-sds-btn').simulate('click');
      value.restore();
      expect(renderSafetySheetsSpy.called).toBe(true);
      renderSafetySheetsSpy.restore();
    });

    it('calls renderChildElements() when query safety sheets button is clicked', () => {
      const renderChildElementsSpy = sinon.spy(wrapper.instance(), 'renderChildElements');
      const value = sinon.stub(wrapper.instance(), 'queryValueFor').returns('7732-18-5');
      wrapper.find('#submit-sds-btn').simulate('click');
      value.restore();
      expect(renderChildElementsSpy.called).toBe(true);
      renderChildElementsSpy.restore();
    });

    it('sends the saved sheet path to the extractor and stores what came back', async () => {
      const sheetPath = '/safety_sheets/merck/252549_web_c0161049cda26386.pdf';
      const extracted = {
        safetyPhrases: { h_statements: { H225: ' x' }, p_statements: {}, pictograms: [] },
        properties: { flash_point: '4 °C', form: 'liquid' },
        diagnostics: { notes: [], errors: [] }
      };
      const fetcherStub = sinon.stub(ChemicalFetcher, 'extractFromSds').resolves(extracted);
      instance.setState({ chemical: createChemical([{ safetySheetPath: [{ merck_link: sheetPath }] }]) });

      await instance.extractFromSheet(sheetPath);

      expect(fetcherStub.calledWith(sheetPath)).toBe(true);
      expect(instance.state.extractedProperties[sheetPath]).toEqual(extracted.properties);
      expect(instance.state.chemical.chemical_data[0].safetyPhrases).toEqual(extracted.safetyPhrases);
      fetcherStub.restore();
    });

    it('reports the reason when the sheet yields nothing', async () => {
      const sheetPath = '/safety_sheets/merck/empty_0000000000000000.pdf';
      const fetcherStub = sinon.stub(ChemicalFetcher, 'extractFromSds').resolves({
        safetyPhrases: { h_statements: {}, p_statements: {}, pictograms: [] },
        properties: {},
        diagnostics: { notes: [], errors: ['ghostscript produced no text'] }
      });

      await instance.extractFromSheet(sheetPath);

      expect(instance.state.warningMessage)
        .toBe('Nothing could be read from this sheet: ghostscript produced no text');
      fetcherStub.restore();
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

    it('renders the SafetyPhrasesEditor with chemical safetyPhrases data', () => {
      const chemicalData = [{
        safetySheetPath: [
          {
            '252549_4c82b57ffb46b49b_link': '/safety_sheets/merck/252549_web_4c82b57ffb46b49b.pdf'
          }
        ],
        safetyPhrases: {
          h_statements: {
            H315: ' Causes skin irritation',
            H319: ' Causes serious eye irritation'
          },
          p_statements: {
            P264: ' Wash skin thoroughly after handling',
            P280: ' Wear protective gloves/protective clothing/eye protection/face protection'
          },
          pictograms: ['GHS07']
        }
      }];

      const newChemical = createChemical(chemicalData, '7681-82-5');
      instance.setState({ chemical: newChemical, displayWell: true });
      wrapper.update();

      // The editor now sits inside the collapsible section wrapper.
      const editor = shallow(instance.renderSafetyPhrases()).find(SafetyPhrasesEditor);
      expect(editor).toHaveLength(1);
      expect(editor.prop('value')).toEqual(chemicalData[0].safetyPhrases);
      expect(typeof editor.prop('onChange')).toBe('function');
    });

    it('handleSafetyPhrasesChange persists into chemical_data via handleFieldChanged', () => {
      const chemicalData = [{}];
      const newChemical = createChemical(chemicalData, '7681-82-5');
      instance.setState({ chemical: newChemical });

      const handleFieldChangedSpy = sinon.spy(instance, 'handleFieldChanged');
      const next = { h_statements: { H200: ' Unstable explosive' }, p_statements: {}, pictograms: [] };
      instance.handleSafetyPhrasesChange(next);

      expect(handleFieldChangedSpy.calledWith('safetyPhrases', next)).toBe(true);
      expect(wrapper.state().chemical.chemical_data[0].safetyPhrases).toEqual(next);
      handleFieldChangedSpy.restore();
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

    it('should call fetchSdsOnServer with expected arguments', () => {
      const fetchSdsOnServerSpy = sinon.spy(instance, 'fetchSdsOnServer');
      const productInfo = {
        vendor: 'Merck',
        sdsLink: 'https://example.com/merck',
        productNumber: '123',
        productLink: 'https://example.com/merck-product',
      };

      instance.fetchSdsOnServer(productInfo)?.catch(() => {});
      expect(fetchSdsOnServerSpy.called).toBe(true);

      sinon.assert.calledOnce(fetchSdsOnServerSpy);
      fetchSdsOnServerSpy.restore();
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
          type: 'sample',
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

    // Ensure the well is displayed and the sheet list renders
    instance.setState({ displayWell: true });
    wrapper.update();
    expect(wrapper.instance().renderSafetySheets()).not.toBe(null);
  });
});
