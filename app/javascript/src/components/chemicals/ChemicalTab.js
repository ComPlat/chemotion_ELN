/* eslint-disable no-underscore-dangle */
import React from 'react';
import PropTypes from 'prop-types';
import {
  Accordion, Form, Button, OverlayTrigger, Tooltip, ButtonToolbar,
  ListGroup, ListGroupItem, InputGroup, Row, Col,
  ButtonGroup, Badge
} from 'react-bootstrap';
import AppModal from 'src/components/common/AppModal';
import { Select } from 'src/components/common/Select';
import { chemicalStatusOptions } from 'src/components/staticDropdownOptions/options';
import ChemicalFetcher from 'src/fetchers/ChemicalFetcher';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import Sample from 'src/models/Sample';
import NumericInputUnit from 'src/apps/mydb/elements/details/NumericInputUnit';
import ButtonGroupToggleButton from 'src/components/common/ButtonGroupToggleButton';
import SDSAttachmentModal from 'src/components/chemicals/SDSAttachmentModal';
import SafetyPhrasesEditor from 'src/components/chemicals/SafetyPhrasesEditor';
import Chemical from 'src/models/Chemical';
import { StoreContext } from 'src/stores/mobx/RootStore';

const PRODUCT_PREVIEW_COUNT = 5;

// Sheets per sample. Searching stays open at the limit; only saving is refused.
const MAX_SAVED_SDS = 5;

// Display names only. The vendor key stays as stored, since it is also the
// safety_sheets directory of every sheet already saved. PubChem's own source names
// are mapped too, so a group header and the sheet it saves read the same.
const VENDOR_DISPLAY_NAMES = {
  merck: 'Sigma-Aldrich',
  'sigma-aldrich': 'Sigma-Aldrich',
  fisher: 'Thermofisher',
  alfa: 'Thermofisher',
  thermofisher: 'Thermofisher',
  thermofischer: 'Thermofisher',
  'thermo fisher': 'Thermofisher',
  'thermo fisher scientific': 'Thermofisher',
  'fisher chemical': 'Thermofisher',
};

// The phrases and properties endpoints know only these two keys, and the whole Thermo
// lineage is stored under the alfa/thermofischer one.
const PROPERTY_VENDOR_KEYS = {
  merck: 'merck',
  'sigma-aldrich': 'merck',
  alfa: 'thermofischer',
  fisher: 'thermofischer',
  thermofisher: 'thermofischer',
  thermofischer: 'thermofischer',
};

// How long the badge shows the outcome of a copy before returning to its resting state.
const COPY_FEEDBACK_MS = 1600;

// What to tell the user when the field the chosen option searches on is empty.
const MISSING_QUERY_HINT = {
  'Product Number': 'Add a product number in Inventory Information, or search by CAS or common name.',
  CAS: 'Assign a CAS number in the labels section, or search by common name.',
  'Common Name': 'This sample has no molecule name yet, so there is nothing to search with.',
};

const propertyVendorKey = (name) => PROPERTY_VENDOR_KEYS[String(name || '').toLowerCase()] || '';

const vendorDisplayName = (name) => {
  if (!name) return name;
  return VENDOR_DISPLAY_NAMES[name.toLowerCase()] || name.charAt(0).toUpperCase() + name.slice(1);
};

export default class ChemicalTab extends React.Component {
  static contextType = StoreContext;
  constructor(props) {
    super(props);
    this.state = {
      chemical: undefined,
      displayWell: false,
      checkSaveIconMerck: false,
      dynamicCheckMarks: {},
      vendorValue: 'Merck',
      queryOption: 'CAS',
      vendorOverview: null,
      expandedVendors: {},
      expandedProducts: {},
      showAllSearchResults: false,
      collapsedSections: {},
      copyFeedback: null,
      safetySheetLanguage: 'en',
      warningMessage: '',
      loadingQuerySafetySheets: false,
      loadingSaveSafetySheets: {},
      loadingPhrasesVendor: '',
      loadChemicalProperties: { vendor: '', loading: false },
      switchRequiredOrderedDate: 'required',
      viewChemicalPropertiesModal: false,
      viewModalForVendor: '',
      showModal: false,
      searchResults: [],
    };
    this.handleFieldChanged = this.handleFieldChanged.bind(this);
    this.handleMetricsChange = this.handleMetricsChange.bind(this);
  }

  componentDidMount() {
    const { sample } = this.props;
    this.fetchChemical(sample);
    this.updateDisplayWell();
  }

  componentWillUnmount() {
    clearTimeout(this.copyFeedbackTimer);
  }

  componentDidUpdate(prevProps, prevState) {
    const { saveInventory } = this.props;
    const { chemical } = this.state;

    if (prevState.chemical !== chemical) {
      this.updateDisplayWell();
    }

    if (saveInventory === true) {
      this.handleSubmitSave();
    }
  }

  handleFieldChanged(parameter, value) {
    let { chemical } = this.state;
    const { editChemical } = this.props;

    if (!chemical) {
      chemical = Chemical.buildEmpty();
    }

    chemical.buildChemical(parameter, value);

    this.setState({ chemical }, () => {
      editChemical(chemical.isEdited);
    });
  }

  handleSubmitSave() {
    const { chemical } = this.state;
    const {
      sample,
      setSaveInventory,
      editChemical,
      type,
      onInventorySaveComplete,
    } = this.props;
    if (!sample || !chemical) {
      setSaveInventory(false);
      if (onInventorySaveComplete) onInventorySaveComplete(false);
      return;
    }
    const chemicalData = chemical._chemical_data || null;
    const cas = sample.xref?.cas ?? '';
    const params = {
      chemical_data: chemicalData,
      cas,
    };
    if (type === 'SBMM') {
      params.sequence_based_macromolecule_sample_id = sample.id;
    } else {
      params.sample_id = sample.id;
    }

    const isNewChemical = chemical.isNew;
    const saveRequest = isNewChemical
      ? ChemicalFetcher.create(params)
      : ChemicalFetcher.update(params);

    if (isNewChemical) {
      chemical.isNew = false;
      editChemical(false);
      chemical.updateChecksum();
    }

    saveRequest
      .then((response) => {
        if (response) {
          if (isNewChemical) {
            this.setState({ chemical });
          } else {
            editChemical(false);
            chemical.updateChecksum();
            this.setState({ chemical });
          }

          if (onInventorySaveComplete) onInventorySaveComplete(true);
        } else if (onInventorySaveComplete) {
          onInventorySaveComplete(false);
        }
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
        if (onInventorySaveComplete) onInventorySaveComplete(false);
      })
      .finally(() => {
        setSaveInventory(false);
      });
  }

  handleRemove(index, document) {
    const { chemical, searchResults } = this.state;

    // Early return if chemical data is not available
    if (!chemical?._chemical_data?.[0]) {
      console.error('Cannot remove safety sheet: Chemical data is unavailable');
      return;
    }

    const parameters = chemical._chemical_data[0];

    // Check if this is a search result or a saved SDS
    const isSearchResult = searchResults.includes(document);

    if (isSearchResult) {
      // Remove from search results
      const updatedSearchResults = searchResults.filter((_, i) => i !== index);
      this.setState({ searchResults: updatedSearchResults });
    } else {
      // Handle saved SDS removal
      const path = parameters?.safetySheetPath;
      if (path && path.length > 0) {
        const dynamicKey = Object.keys(document).find((key) => key.endsWith('_link'));
        if (dynamicKey) {
          // Extract vendor name from the link key (e.g., 'merck' from 'merck_link')
          const normalizedVendorName = ChemicalTab.vendorFromDocument(document);
          const vendorName = normalizedVendorName;

          // Find the safety sheet with this vendor link
          const vendorIndex = path.findIndex((element) => element[dynamicKey] === document[dynamicKey]);

          if (vendorIndex !== -1) {
            // Remove vendor product info
            const vendorProductKey = `${vendorName}ProductInfo`;
            if (parameters[vendorProductKey]) {
              delete parameters[vendorProductKey];
            }

            // Remove the safety sheet path entry
            path.splice(vendorIndex, 1);

            if (normalizedVendorName === 'merck') {
              this.setState({ checkSaveIconMerck: false });
            }

            // Also remove from dynamicCheckMarks
            this.setState((prevState) => {
              const updatedCheckMarks = { ...prevState.dynamicCheckMarks };
              delete updatedCheckMarks[normalizedVendorName];
              return { dynamicCheckMarks: updatedCheckMarks };
            });

            // Update the state and save changes
            this.setState({ chemical }, () => {
              // After state update, save to server
              this.handleSubmitSave();
            });
          }
        }
      }
    }

    // Clear any warning messages
    this.setState({ warningMessage: '' });
    this.updateCheckMark(document);
  }

  handleCheckMark(vendor, isNew = null) {
    const normalizedVendor = String(vendor || '').toLowerCase();
    if (!normalizedVendor) return;

    if (normalizedVendor === 'merck') {
      this.setState({ checkSaveIconMerck: isNew !== null ? isNew : true });
    }

    // Store in dynamic check marks for all vendors
    this.setState((prevState) => {
      // Initialize or use existing dynamicCheckMarks
      const dynamicCheckMarks = prevState.dynamicCheckMarks || {};

      // Set check mark for this vendor to true
      return {
        dynamicCheckMarks: {
          ...dynamicCheckMarks,
          [normalizedVendor]: true
        }
      };
    });
  }

  // Brand only shapes a Sigma catalogue URL, so leaving Sigma drops the choice rather
  // than carrying a stale one back.
  handleVendorOption(value) {
    this.setState({ vendorValue: value });
  }

  handleQueryOption(value) {
    this.setState({ queryOption: value });
  }

  toggleVendor(vendor) {
    this.setState((prev) => ({
      expandedVendors: { ...prev.expandedVendors, [vendor]: !prev.expandedVendors[vendor] },
    }));
  }

  toggleSection(id, defaultOpen = true) {
    this.setState((prev) => ({
      collapsedSections: {
        ...prev.collapsedSections,
        [id]: prev.collapsedSections[id] === undefined ? defaultOpen : !prev.collapsedSections[id],
      },
    }));
  }

  isSectionOpen(id, defaultOpen = true) {
    const { collapsedSections } = this.state;
    if (collapsedSections[id] === undefined) return defaultOpen;

    return !collapsedSections[id];
  }

  toggleVendorProducts(vendor) {
    this.setState((prev) => ({
      expandedProducts: { ...prev.expandedProducts, [vendor]: !prev.expandedProducts[vendor] },
    }));
  }

  handleLanguageOption(value) {
    this.setState({ safetySheetLanguage: value });
  }

  handlePropertiesModal(vendor) {
    this.setState({
      viewChemicalPropertiesModal: true,
      viewModalForVendor: vendor
    });
  }

  // eslint-disable-next-line react/sort-comp
  handleMetricsChange(parameter, newValue, newUnit) {
    const paramObj = { unit: newUnit, value: newValue };
    this.handleFieldChanged(parameter, paramObj);
  }

  handleAdd() {
    this.setState({ showModal: true });
  }

  /**
   * Returns a snapshot of the current chemical data so the parent can persist
   * it after the sample is created (when ChemicalTab cannot save itself because
   * the sample has no server-side ID yet).
   * @returns {{ chemical_data: any, cas: string } | null}
   */
  getChemicalSnapshot() {
    const { chemical } = this.state;
    const { sample } = this.props;
    if (!chemical) return null;
    return {
      chemical_data: chemical._chemical_data || null,
      cas: sample?.xref?.cas ?? '',
    };
  }

  // The provider is absent in shallow renders; a missing toast must not take the
  // action down with it.
  notify(payload) {
    this.context?.notifications?.add(payload);
  }

  notifyMissingQueryValue(option) {
    this.notify({
      title: `No ${option.toLowerCase()} to search with`,
      message: MISSING_QUERY_HINT[option],
      level: 'warning',
      position: 'tc',
    });
  }

  // The badge answers for itself for a moment rather than raising a toast. Clipboard
  // access is refused outside a secure context, so failure shows too.
  copyProductNumber(value) {
    const show = (ok) => {
      clearTimeout(this.copyFeedbackTimer);
      this.setState({ copyFeedback: { value, ok } });
      this.copyFeedbackTimer = setTimeout(() => this.setState({ copyFeedback: null }), COPY_FEEDBACK_MS);
    };

    const write = navigator?.clipboard?.writeText?.(value);
    if (!write) {
      show(false);
      return Promise.resolve();
    }

    return write.then(() => show(true)).catch(() => show(false));
  }

  // The value the chosen option searches on. Empty means there is nothing to send.
  queryValueFor(option) {
    const { chemical } = this.state;
    const { sample } = this.props;

    if (option === 'Product Number') return (chemical?._chemical_data?.[0]?.product_number ?? '').trim();
    if (option === 'Common Name') return (sample.molecule_name_hash?.label ?? '').trim();

    return (sample.xref?.cas ?? '').trim();
  }

  querySafetySheets = () => {
    const { sample } = this.props;
    const {
      chemical, vendorValue, queryOption, safetySheetLanguage
    } = this.state;

    // Reported before any request, so an empty CAS or name does not become a vendor
    // round trip that comes back empty for a reason the user cannot see.
    const searchStr = this.queryValueFor(queryOption);
    if (!searchStr) {
      this.notifyMissingQueryValue(queryOption);
      return;
    }

    this.setState({ loadingQuerySafetySheets: true });
    const sampleName = sample.showedName();
    const moleculeId = sample.molecule_name_hash?.mid ?? null;
    if (chemical) {
      chemical.buildChemical('sample_name', sampleName);
      chemical.buildChemical('molecule_id', moleculeId);
    }

    // PubChem is reached by the molecule either way; a product number only narrows the
    // vendor listing it returns, so the identifier still has to come from the sample.
    const byNumber = queryOption === 'Product Number';
    const identifier = byNumber
      ? (sample.xref?.cas || sample.molecule_name_hash?.label || '')
      : searchStr;

    if (byNumber && !identifier) {
      this.notifyMissingQueryValue('CAS');
      this.setState({ loadingQuerySafetySheets: false });
      return;
    }

    const queryParams = {
      id: moleculeId,
      vendor: vendorValue,
      queryOption,
      language: safetySheetLanguage,
      string: identifier,
      productNumber: byNumber ? searchStr : null
    };
    this.setState({ warningMessage: '' });

    ChemicalFetcher.fetchSafetySheets(queryParams).then((result) => {
      const obj = JSON.parse(result);
      if (obj?.sds_vendors || obj?.catalogue_vendors) {
        // A search that found nothing reads the same here as it does for one vendor.
        const nothingFound = !obj.sds_vendors?.length && !obj.catalogue_vendors?.length;
        this.setState({
          vendorOverview: nothingFound ? null : obj,
          searchResults: nothingFound && obj.message ? [obj.message] : [],
          loadingQuerySafetySheets: false,
          displayWell: true,
          warningMessage: '',
        });
        return;
      }
      if (obj !== null && obj !== undefined) {
        const newResults = Object.values(obj);
        this.setState({
          searchResults: newResults,
          vendorOverview: null,
          loadingQuerySafetySheets: false,
          displayWell: true
        });
      } else {
        // A non-ok response comes back as null; without this the list rendered a
        // placeholder string that threw further down and blanked the whole section.
        this.setState({
          searchResults: [],
          vendorOverview: null,
          loadingQuerySafetySheets: false,
          displayWell: true,
          warningMessage: 'The vendor did not return any safety data sheets for this sample.'
        });
      }
    }).catch((errorMessage) => {
      console.log(errorMessage);
      this.setState({ loadingQuerySafetySheets: false });
    });
  };

  handleSafetyPhrasesChange = (next) => {
    this.handleFieldChanged('safetyPhrases', next);
  };

  isSavedSds = () => {
    const { chemical } = this.state;
    const isSaved = chemical?._chemical_data?.[0]?.safetySheetPath?.some(
      (sheet) => Object.keys(sheet).some((key) => key.endsWith('_link') && sheet[key])
    );
    return isSaved;
  };

  extractProductInfo = (vendor) => {
    const { chemical } = this.state;
    let productLink = '';
    if (chemical && vendor === 'thermofischer') {
      productLink = chemical._chemical_data[0].alfaProductInfo
        ? chemical._chemical_data[0].alfaProductInfo.productLink : '';
    } else if (chemical && vendor === 'merck') {
      productLink = chemical._chemical_data[0].merckProductInfo
        ? chemical._chemical_data[0].merckProductInfo.productLink : '';
    }
    return productLink;
  };

  fetchSafetyPhrases = (vendor) => {
    const { sample } = this.props;
    const queryParams = {
      vendor, id: sample.id
    };

    // Set loading state for this vendor
    this.setState({
      warningMessage: '',
      loadingPhrasesVendor: vendor
    });

    const productLink = this.extractProductInfo(vendor);

    if (!productLink) {
      if (this.isSavedSds()) {
        this.setState({
          loadingPhrasesVendor: '',
          warningMessage: 'No product link available for this vendor' });
        return;
      }
      this.setState({
        loadingPhrasesVendor: '',
        warningMessage: 'Please fetch and save corresponding safety data sheet first' });
      return;
    }

    ChemicalFetcher.safetyPhrases(queryParams).then((result) => {
      // Clear loading state
      this.setState({ loadingPhrasesVendor: '' });
      const warningMessage = 'No safety phrases could be found';
      if (result === warningMessage || result === 204) {
        this.setState({ warningMessage });
      } else if (result === 'Could not find H and P phrases') {
        this.setState({ warningMessage: result });
      } else {
        this.handleFieldChanged('safetyPhrases', result);
      }
    }).catch((errorMessage) => {
      console.log(errorMessage);
      // Clear loading state on error
      this.setState({ loadingPhrasesVendor: '' });
    });
  };

  fetchChemicalProperties = (vendor) => {
    const { chemical } = this.state;
    this.setState({ warningMessage: '' });

    const productLink = this.extractProductInfo(vendor);

    if (!productLink) {
      if (this.isSavedSds()) {
        this.setState({ warningMessage: 'No product link available for this vendor' });
        return;
      }
      this.setState({ warningMessage: 'Please fetch and save corresponding safety data sheet first' });
      return;
    }

    this.setState({ loadChemicalProperties: { vendor, loading: true } });
    ChemicalFetcher.chemicalProperties(productLink).then((result) => {
      this.setState({ loadChemicalProperties: { vendor: '', loading: false } });
      if (result === 'Could not find additional chemical properties' || result === null) {
        // Only show warning if this is a saved SDS
        if (this.isSavedSds()) {
          this.setState({ warningMessage: result });
        }
      } else {
        if (chemical && vendor === 'thermofischer') {
          chemical._chemical_data[0].alfaProductInfo.properties = result;
        } else if (chemical && vendor === 'merck') {
          if (chemical._chemical_data && chemical._chemical_data[0] && chemical._chemical_data[0].merckProductInfo) {
            chemical._chemical_data[0].merckProductInfo.properties = result;
          }
        }
        this.mapToSampleProperties(vendor);
      }
    }).catch((errorMessage) => {
      console.log(errorMessage);
      this.setState({
        loadChemicalProperties: { vendor: '', loading: false },
        warningMessage: this.isSavedSds() ? 'Error fetching chemical properties' : ''
      });
    });
  };

  querySafetyPhrases = (vendor) => {
    // Only enable for special vendors: merck and thermofischer
    const specialVendor = vendor === 'merck' || vendor === 'thermofischer';
    const { loadingPhrasesVendor } = this.state;
    const isLoading = loadingPhrasesVendor === vendor;

    const button = (
      <Button
        id="safetyPhrases-btn"
        onClick={() => this.fetchSafetyPhrases(vendor)}
        variant="light"
        disabled={!specialVendor || isLoading}
      >
        {isLoading ? (
          <div>
            <i className="fa fa-spinner fa-pulse fa-fw" />
            <span className="ms-1">Loading phrases...</span>
          </div>
        ) : (
          <>
            fetch Safety Phrases
            {!specialVendor && (
              <span className="ms-1"><i className="fa fa-info-circle" /></span>
            )}
          </>
        )}
      </Button>
    );

    // If disabled, wrap in an OverlayTrigger to show the tooltip
    if (!specialVendor) {
      return (
        <OverlayTrigger
          placement="top"
          overlay={(
            <Tooltip id="disabledPhrases">
              Fetching safety phrases is not available for manually attached safety sheets
            </Tooltip>
          )}
        >
          <div>{button}</div>
        </OverlayTrigger>
      );
    }

    return button;
  };

  // Sigma-Aldrich refuses the server's own request but serves the sheet with
  // access-control-allow-origin *, so the browser reads it and hands us the bytes.
  fetchSdsInBrowser = ({ sdsLink, productNumber, productLink }, vendorName) => fetch(sdsLink)
    .then((response) => {
      if (!response.ok) throw new Error(`the vendor answered ${response.status}`);
      return response.blob();
    })
    .then((blob) => {
      if (blob.type && !blob.type.includes('pdf')) throw new Error('the vendor did not return a PDF');
      return this.handleAttachmentSubmit({
        productNumber,
        vendorName,
        attachedFile: new File([blob], `${productNumber}.pdf`, { type: 'application/pdf' }),
        productLink,
        safetySheetLink: sdsLink,
      });
    });

  // Tries the vendor's routes in the order the backend ranked them, reporting the first
  // failure only once every route is spent. Cf. ChemicalsService.vendor_save_modes.
  saveSdsViaRoutes = (routes, productInfo, vendorName) => {
    const { productNumber } = productInfo;

    if (this.atSavedSdsLimit()) {
      this.notifySavedSdsLimit();
      return Promise.resolve();
    }

    this.setState((prev) => ({
      loadingSaveSafetySheets: { ...prev.loadingSaveSafetySheets, [productNumber]: true },
    }));

    const attempt = (index, firstError) => {
      if (index >= routes.length) {
        return Promise.reject(firstError || new Error('no save route is available'));
      }

      const run = routes[index] === 'browser'
        ? () => this.fetchSdsInBrowser(productInfo, vendorName)
        : () => this.fetchSdsOnServer(productInfo);

      return Promise.resolve().then(run).catch((error) => attempt(index + 1, firstError || error));
    };

    return attempt(0, null)
      .catch((error) => {
        this.notify({
          title: 'Could not save the safety data sheet',
          message: `${error.message}. Open the sheet and attach it with Upload SDS instead.`,
          level: 'error',
          position: 'tc',
        });
      })
      .finally(() => this.setState((prev) => ({
        loadingSaveSafetySheets: { ...prev.loadingSaveSafetySheets, [productNumber]: false },
      })));
  };

  handleAttachmentSubmit = ({
    productNumber,
    vendorName,
    attachedFile,
    productLink,
    safetySheetLink,
  }) => {
    const { sample, editChemical } = this.props;
    const { chemical } = this.state;
    const cas = sample.xref?.cas ?? '';
    const vendorProduct = `${vendorName.toLowerCase().trim()}ProductInfo`;
    const data = new FormData();

    // Create vendor info object - only what we need
    const vendorInfo = {
      productNumber,
      vendor: vendorName,
    };

    if (productLink) {
      vendorInfo.productLink = productLink;
    }

    if (safetySheetLink) {
      vendorInfo.sdsLink = safetySheetLink;
    }

    // Append all parameters to FormData
    data.append('sample_id', sample.id);
    data.append('cas', cas);
    data.append('vendor_info', JSON.stringify(vendorInfo));
    data.append('vendor_name', vendorName);
    data.append('vendor_product', vendorProduct);
    data.append('attached_file', attachedFile);

    // Initialize chemical data if it doesn't exist
    if (!chemical) {
      this.setState({
        chemical: new Chemical({
          _chemical_data: [{}]
        })
      });
    }

    // Include current chemical data if it exists
    if (chemical && chemical._chemical_data && chemical._chemical_data[0]) {
      data.append('chemical_data', JSON.stringify(chemical._chemical_data[0]));
    }

    this.setState({ showModal: false });

    // Send data to server
    // Rejects rather than notifying, so saveSdsViaRoutes can fall through to the next route.
    return ChemicalFetcher.saveManualAttachedSafetySheet(data)
      .then((updatedChemical) => {
        if (!updatedChemical) throw new Error('the server did not return the saved sheet');
        if (updatedChemical.error) throw new Error(updatedChemical.error);

        const chemicalInstance = new Chemical(updatedChemical);
        // Clearing the results moves the row into the saved list instead of leaving a
        // duplicate of it under Search Results with a dead save button.
        this.setState({ chemical: chemicalInstance, searchResults: [] });
        editChemical(false);
        chemicalInstance.updateChecksum();
      });
  };

  // The upload modal has no route chain behind it, so it reports its own failure.
  submitManualAttachment = (payload) => this.handleAttachmentSubmit(payload)
    .catch((error) => {
      this.notify({
        title: 'Could not attach safety sheet',
        message: error.message,
        level: 'error',
        position: 'tc',
      });
    });

  fetchChemical(sample) {
    const { type } = this.props;
    if (sample === undefined || sample.is_new) {
      return;
    }
    ChemicalFetcher.fetchChemical(sample.id, type).then((chemical) => {
      if (chemical !== null) {
        this.setState({ chemical });
      }
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  /* eslint-disable prefer-destructuring */
  mapToSampleProperties(vendor) {
    const { sample, handleUpdateSample } = this.props;
    const { chemical } = this.state;
    const chemicalData = chemical?._chemical_data[0] || [];
    let properties = {};

    if (vendor === 'thermofischer') {
      properties = chemicalData.alfaProductInfo.properties;
    } else if (vendor === 'merck') {
      properties = chemicalData.merckProductInfo.properties;
    }

    const updateSampleProperty = (propertyName, propertyValue) => {
      if (propertyValue) {
        const rangeValues = propertyValue.replace(/°C?/g, '').trim().split('-');
        // replace hyphen with minus sign and parse
        const lowerBound = parseFloat(rangeValues[0].replace('−', '-')) || Number.NEGATIVE_INFINITY;
        const upperBound = rangeValues.length === 2 ? parseFloat(rangeValues[1].replace('−', '-')) : Number.POSITIVE_INFINITY;
        sample.updateRange(propertyName, lowerBound, upperBound);
      }
    };

    updateSampleProperty('boiling_point', properties.boiling_point);
    updateSampleProperty('melting_point', properties.melting_point);

    sample.xref.flash_point = {
      unit: '°C',
      value: properties.flash_point
    };

    const densityNumber = properties.density?.match(/[0-9.]+/g);
    if (densityNumber) {
      sample.density = densityNumber[0];
    }

    sample.xref.form = properties.form || sample.xref.form;
    sample.xref.color = properties.color || sample.xref.color;
    sample.xref.refractive_index = properties.refractive_index || sample.xref.refractive_index;
    sample.xref.solubility = properties.solubility || sample.xref.solubility;

    if (handleUpdateSample) {
      handleUpdateSample(sample);
      ElementActions.updateSample(new Sample(sample), false);
    }
  }

  chemicalStatus(data) {
    const status = data?.status;
    return (
      <Form.Group>
        <Form.Label>Status</Form.Label>
        <Select
          name="chemicalStatus"
          options={chemicalStatusOptions}
          onChange={(selectedOption) => { this.handleFieldChanged('status', selectedOption?.value); }}
          value={chemicalStatusOptions.find(({ value }) => value === status)}
          isClearable={false}
        />
      </Form.Group>
    );
  }

  textInput(data, label, parameter) {
    const { sample } = this.props;
    const componentClass = parameter !== 'important_notes'
      && parameter !== 'disposal_info' && parameter !== 'sensitivity_storage'
    && parameter !== 'solubility' ? 'input' : 'textarea';
    let value = '';
    if (parameter !== 'cas') {
      value = data?.[parameter] ?? '';
    } else {
      value = data || '';
    }
    let conditionalOverlay = null;
    if (parameter === 'person') {
      conditionalOverlay = 'please enter the name of the person who ordered the substance';
    } else if (parameter === 'required_by') {
      conditionalOverlay = 'please enter the name of the person who requires the substance';
    } else if (parameter === 'expiration_date') {
      conditionalOverlay = 'please enter the expiration date of the substance';
    } else if (parameter === 'inventory_label') {
      value = sample.xref?.inventory_label ?? '';
    }
    const checkLabel = label !== 'Date' && <Form.Label>{label}</Form.Label>;
    const dateArray = ['person', 'required_by', 'expiration_date'];

    return (
      <OverlayTrigger
        placement="top"
        overlay={dateArray.includes(parameter)
          ? <Tooltip id="field-text-input">{conditionalOverlay}</Tooltip> : <div />}
      >
        <Form.Group>
          {checkLabel}
          <Form.Control
            as={componentClass}
            id={`textInput_${label}`}
            type="text"
            value={value}
            onChange={(e) => { this.handleFieldChanged(parameter, e.target.value); }}
            rows={label !== 'Important notes' && label !== 'Disposal information' ? 1 : 2}
            disabled={parameter === 'inventory_label'}
          />
        </Form.Group>
      </OverlayTrigger>
    );
  }

  copyButton(document) {
    const { chemical } = this.state;
    let info = '';
    let value = null;

    // Get chemical data if available
    if (chemical && chemical._chemical_data && chemical._chemical_data.length !== 0) {
      info = chemical._chemical_data[0];
    }

    // Find any vendor link key (could be alfa_link, merck_link, manual_link, etc.)
    const vendorLinkKey = Object.keys(document).find((key) => key.endsWith('_link'));

    if (vendorLinkKey) {
      value = document[vendorLinkKey];
      // Extract vendor name from the value, using regex /safety_sheets/([^/]+)/
      const vendorLinkMatch = value.match(/\/safety_sheets\/([^/]+)\//);
      let vendorName;
      let productLinkKey;
      let productInfoKey;
      if (vendorLinkMatch && vendorLinkMatch[1]) {
        // If the match is successful, use the vendor name from the link
        vendorName = vendorLinkMatch[1];
        productLinkKey = `${vendorName}_product_link`;
        productInfoKey = `${vendorName}ProductInfo`;
      }

      // Try to get the product link from chemical data first
      if (info && info[productInfoKey] && info[productInfoKey].productLink) {
        value = info[productInfoKey].productLink;
      } else if (document[productLinkKey]) {
        value = document[productLinkKey];
      }
    }

    const tooltipMessage = value ? `product link (${value})` : 'No product link available';

    return (
      <OverlayTrigger placement="bottom" overlay={<Tooltip id="productLink_button">{tooltipMessage}</Tooltip>}>
        <div>
          <Button
            active
            size="xsm"
            variant="light"
            disabled={!value}
          >
            {value ? (
              <a href={value} target="_blank" rel="noreferrer">
                <i className="fa fa-external-link" />
              </a>
            ) : (
              <i className="fa fa-external-link text-muted" />
            )}
          </Button>
        </div>
      </OverlayTrigger>
    );
  }

  locationInput(data, parameter, domain) {
    const value = data?.[parameter] ?? '';
    const subLabel = (parameter.split('_'))[1];
    const string = domain.replace(/_/g, ' ');
    const modifyStr = string.charAt(0).toUpperCase() + string.slice(1);
    const ParentLabelCondition = ['host_building', 'current_building', 'host_group', 'current_group'];
    const ParentLabel = ParentLabelCondition.includes(parameter)
      ? <Form.Label>{modifyStr}</Form.Label> : <Form.Label className="pt-3"> </Form.Label>;
    const paramsObj = {};
    paramsObj[domain] = parameter;

    return (
      <div>
        {ParentLabel}
        <InputGroup>
          <InputGroup.Text>{subLabel}</InputGroup.Text>
          <Form.Control
            type="text"
            value={value}
            onChange={(e) => { this.handleFieldChanged(parameter, e.target.value); }}
          />
        </InputGroup>
      </div>
    );
  }

  numInputWithoutTable(data, label, parameter) {
    const value = data?.[parameter]?.value;
    let unit; let field;
    if (parameter === 'amount') {
      unit = data?.[parameter]?.unit ?? 'mg';
      field = 'chemical_amount_in_g';
    } else if (parameter === 'volume') {
      unit = data?.[parameter]?.unit ?? 'ml';
      field = 'chemical_amount_in_l';
    } else if (parameter === 'storage_temperature') {
      unit = data?.[parameter]?.unit ?? '°C';
      field = 'storage_temperature';
    }
    return (
      <NumericInputUnit
        field={field}
        inputDisabled={false}
        onInputChange={
          (newValue, newUnit) => this.handleMetricsChange(parameter, newValue, newUnit)
        }
        unit={unit}
        numericValue={value}
        label={label}
      />
    );
  }

  // A saved sheet names its vendor in the stored path; a search result only carries the
  // vendor's own URL, so the link key answers for it. Returns '' when neither does.
  static vendorFromDocument(document) {
    const key = Object.keys(document || {}).find((k) => k.endsWith('_link') && document[k]);
    if (!key) return '';

    const fromPath = String(document[key]).match(/\/safety_sheets\/([^/]+)\//);
    if (fromPath) return fromPath[1].toLowerCase();

    const fromKey = key.replace('_link', '');
    return /^[a-z]+$/i.test(fromKey) ? fromKey.toLowerCase() : '';
  }

  updateCheckMark(document) {
    const vendor = ChemicalTab.vendorFromDocument(document);
    if (vendor) this.handleCheckMark(vendor, false);
  }

  checkMarkButton(document) {
    const {
      checkSaveIconMerck,
      dynamicCheckMarks = {},
      chemical
    } = this.state;

    // Find the dynamic vendor key
    const dynamicKey = Object.keys(document).find((key) => key.endsWith('_link'));
    if (!dynamicKey) {
      return null;
    }

    const vendorName = dynamicKey.replace('_link', '');
    const normalizedVendorName = vendorName.toLowerCase();

    // Check if the document link exists in the safety sheet paths
    let hasSavedSheet = false;
    if (chemical?._chemical_data?.[0]?.safetySheetPath) {
      const safetySheets = chemical._chemical_data[0].safetySheetPath;
      hasSavedSheet = safetySheets.some((sheet) => sheet[dynamicKey] === document[dynamicKey]);
    }

    // Determine if we should show the check mark (either from state or direct check)
    let checkSaveIcon = hasSavedSheet;

    // If not found in actual safety sheet data, check state variables
    if (!checkSaveIcon) {
      // First check traditional state variables for backward compatibility
      if (vendorName === 'merck') {
        checkSaveIcon = checkSaveIconMerck;
      } else {
        // Check our dynamic state for any other vendor
        checkSaveIcon = dynamicCheckMarks[normalizedVendorName] || false;
      }
    }

    // Check if the document has the vendor link and we should show a check mark
    if (document[dynamicKey] && checkSaveIcon) {
      return (
        <OverlayTrigger
          placement="top"
          overlay={(
            <Tooltip id={`saveCheckIcon${vendorName}`}>
              File is already saved
            </Tooltip>
          )}
        >
          <i className="fa fa-check-circle" />
        </OverlayTrigger>
      );
    }

    return null;
  }

  removeButton(index, document) {
    return (
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id={`remove-sds-${index}`}>Remove this safety data sheet</Tooltip>}
      >
        <Button
          size="xsm"
          variant="danger"
          onClick={() => this.handleRemove(index, document)}
        >
          <i className="fa fa-trash-o" />
        </Button>
      </OverlayTrigger>
    );
  }

  // Thermofisher and Merck sheets are stored under their legacy keys.
  static vendorProductKey(vendor) {
    if (vendor === 'Thermofisher') return 'alfaProductInfo';
    if (vendor === 'Merck') return 'merckProductInfo';

    return `${vendor.toLowerCase()}ProductInfo`;
  }

  // Rejects rather than notifying, so saveSdsViaRoutes can fall through to the next route.
  fetchSdsOnServer = (productInfo) => {
    const { chemical } = this.state;
    const { sample, editChemical } = this.props;
    const vendorProduct = ChemicalTab.vendorProductKey(productInfo.vendor);

    this.handleFieldChanged(vendorProduct, productInfo);

    const params = {
      sample_id: sample.id,
      cas: sample.xref?.cas ?? '',
      chemical_data: chemical._chemical_data,
      vendor_product: vendorProduct
    };

    return ChemicalFetcher.saveSafetySheets(params).then((updatedChemical) => {
      if (!updatedChemical) throw new Error('the server could not retrieve the sheet');

      chemical.isNew = false;
      const chemicalInstance = new Chemical(updatedChemical);
      this.setState({ chemical: chemicalInstance, searchResults: [] });
      editChemical(false);
      chemicalInstance.updateChecksum();
      this.handleCheckMark(productInfo.vendor);
    });
  };

  saveSafetySheetsButton(sdsInfo) {
    const {
      checkSaveIconMerck,
      loadingSaveSafetySheets, chemical, dynamicCheckMarks = {}
    } = this.state;

    // Find any key that ends with "_link" to determine vendor
    const vendorLinkKey = Object.keys(sdsInfo).find((key) => key.endsWith('_link'));
    if (!vendorLinkKey) {
      return null;
    }

    // Rows saved before save_modes existed carry one mode; older ones were all server
    // downloads. An empty list means no route reaches the sheet, so no save is offered.
    const saveModes = (sdsInfo.save_modes || [sdsInfo.save_mode || 'server'])
      .filter((mode) => mode !== 'none');
    if (saveModes.length === 0) {
      return null;
    }

    // Extract vendor information
    const vendorName = vendorLinkKey.replace('_link', '');
    const normalizedVendorName = vendorName.toLowerCase();
    const sdsLink = sdsInfo[vendorLinkKey];
    const productNumberKey = `${vendorName}_product_number`;
    const productLinkKey = `${vendorName}_product_link`;
    const productNumber = sdsInfo[productNumberKey];
    const productLink = sdsInfo[productLinkKey];

    // Determine vendor display name (capitalize first letter)
    const displayVendorName = vendorName.charAt(0).toUpperCase() + vendorName.slice(1);

    // Check if this safety sheet is already saved
    let isSaved = false;

    // 1. Check in the actual safety sheet data
    if (chemical?._chemical_data?.[0]?.safetySheetPath) {
      const safetySheets = chemical._chemical_data[0].safetySheetPath;
      isSaved = safetySheets.some((sheet) => {
        const key = Object.keys(sheet).find((k) => /^(\d+)_/.test(k));
        const extractProductNumber = key ? key.match(/^(\d+)_/)[1] : null;
        // Disable save button if safety sheet file of same product number for merck vendor already saved
        const existingMerckSafetySheet = normalizedVendorName === 'merck' && extractProductNumber === productNumber;
        return (sheet[vendorLinkKey] === sdsLink || existingMerckSafetySheet);
      });
    }

    // 2. If not found in data, check state variables
    if (!isSaved) {
      // Check traditional state variables for backward compatibility
      if (normalizedVendorName === 'merck') {
        isSaved = checkSaveIconMerck;
      } else {
        // Check dynamic state for any other vendor
        isSaved = dynamicCheckMarks[normalizedVendorName] || false;
      }
    }

    const productInfo = {
      vendor: displayVendorName,
      sdsLink,
      productNumber,
      productLink,
    };

    // Check if this specific element is loading
    const isLoading = productNumber && loadingSaveSafetySheets[productNumber];

    const tooltip = (() => {
      if (isSaved) return 'This sheet is already saved with the sample';
      if (this.atSavedSdsLimit()) return `Limit of ${MAX_SAVED_SDS} reached. Delete a saved sheet first.`;
      return 'Save this safety data sheet with the sample';
    })();

    return (
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id={`save-sds-${productNumber || 'sheet'}`}>{tooltip}</Tooltip>}
      >
        <div>
          <Button
            id="saveSafetySheetButton"
            size="xsm"
            variant="warning"
            disabled={isSaved}
            onClick={() => this.saveSdsViaRoutes(saveModes, productInfo, vendorName)}
          >
            {isLoading ? (
              <div>
                <i className="fa fa-spinner fa-pulse fa-fw" />
              </div>
            ) : <i className="fa fa-save" />}
          </Button>
        </div>
      </OverlayTrigger>
    );
  }

  savedSdsCount() {
    const { chemical } = this.state;
    return (chemical?._chemical_data?.[0]?.safetySheetPath || []).length;
  }

  // Shared by the upload button and the per-row save, so both refuse at the same count.
  atSavedSdsLimit() {
    return this.savedSdsCount() >= MAX_SAVED_SDS;
  }

  notifySavedSdsLimit() {
    this.notify({
      title: `Limit of ${MAX_SAVED_SDS} safety data sheets reached`,
      message: `This sample already has ${this.savedSdsCount()} saved sheets. `
        + 'Delete at least one below to save another. Searching stays available.',
      level: 'warning',
      position: 'tc',
    });
  }

  addAttachment() {
    const hasMaxAttachments = this.atSavedSdsLimit();

    const button = (
      <Button
        size="sm"
        variant="success"
        onClick={() => (hasMaxAttachments ? this.notifySavedSdsLimit() : this.handleAdd())}
      >
        <i className="fa fa-plus" />
      </Button>
    );

    const message = hasMaxAttachments
      ? `Limit of ${MAX_SAVED_SDS} reached. Delete a saved sheet below to attach another.`
      : 'Attach a safety data sheet from your computer';

    return (
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id="max-attachments-tooltip">{message}</Tooltip>}
      >
        <div>{button}</div>
      </OverlayTrigger>
    );
  }

  chooseVendor() {
    const { vendorValue } = this.state;
    const vendorOptions = [
      { label: 'Sigma-Aldrich', value: 'Merck' },
      { label: 'Thermofisher', value: 'Thermofisher' },
      { label: 'All vendors (PubChem)', value: 'All' },
    ];

    return (
      <Form.Group data-component="chooseVendor">
        <Form.Label>Vendor</Form.Label>
        <Select
          name="chemicalVendor"
          isClearable={false}
          options={vendorOptions}
          onChange={(selectedOption) => this.handleVendorOption(selectedOption?.value)}
          value={vendorOptions.find((option) => option.value === vendorValue)}
        />
      </Form.Group>
    );
  }

  queryOption() {
    const { queryOption } = this.state;
    const { sample } = this.props;
    const cas = sample.xref?.cas ?? '';
    const queryOptions = [
      { label: 'Common Name', value: 'Common Name' },
      { label: 'CAS', value: 'CAS' },
      { label: 'Product Number', value: 'Product Number' }
    ];
    const conditionalOverlay = `Assign a cas number using the cas field in labels section
    for better search results using cas number`;

    return (
      <Form.Group>
        <Form.Label>
          Query SDS using
          <OverlayTrigger
            placement="top"
            overlay={cas && cas !== '' ? <Tooltip>{conditionalOverlay}</Tooltip> : <div />}
          >
            <i className="fa fa-info-circle ms-1" />
          </OverlayTrigger>
        </Form.Label>
        <Select
          name="queryOption"
          isClearable={false}
          options={queryOptions}
          onChange={(selectedOption) => this.handleQueryOption(selectedOption?.value)}
          value={queryOptions.find(({ value }) => value === queryOption)}
        />
      </Form.Group>
    );
  }

  // Brand keys are the vendor's own URL segments; a wrong one yields a 404 on their site.
  // The number itself comes from Inventory Information, not from a field duplicated here.
  safetySheetLanguage() {
    const { safetySheetLanguage } = this.state;
    const languageOptions = [
      { label: 'English', value: 'en' },
      { label: 'Deutsch', value: 'de' },
      { label: 'French', value: 'fr' },
    ];

    return (
      <Form.Group>
        <Form.Label>Choose Language of SDS</Form.Label>
        <Select
          name="languageOption"
          isClearable={false}
          options={languageOptions}
          onChange={(selectedOption) => this.handleLanguageOption(selectedOption?.value)}
          value={languageOptions.find(({ value }) => value === safetySheetLanguage)}
        />
      </Form.Group>
    );
  }

  renderChildElements = (document, index) => {
    if (!document) {
      return null;
    }

    const linkKey = Object.keys(document).find((key) => key.endsWith('_link')
          && !key.includes('_product_link')
          && document[key]);

    const vendorLink = linkKey ? document[linkKey] : null;
    let displayName = 'queried vendor';
    let vendorKey = '';
    let productInfo = '';
    let versionInfo = '';

    if (vendorLink && vendorLink.includes('/safety_sheets/')) {
      // Extract vendor from file path: /safety_sheets/merck/270709_hash.pdf -> merck
      const pathParts = vendorLink.split('/');
      const vendorFromPath = pathParts[2]; // safety_sheets/[vendor]/filename
      const fileName = pathParts[pathParts.length - 1]; // get the filename

      if (vendorFromPath) {
        displayName = vendorDisplayName(vendorFromPath);
        vendorKey = vendorFromPath.toLowerCase();
      }

      // Extract product number from filename: 270709_4c82b57ffb35b49b.pdf -> 270709
      const productMatch = fileName.match(/^([^_]+)_(?:web_)?([a-f0-9]{16})\.pdf$/);
      if (productMatch) {
        const productNumber = productMatch[1];
        productInfo = ` - ${productNumber}`;

        // Count versions for the same vendor AND product number
        const { chemical } = this.state;
        const savedSds = chemical?._chemical_data?.[0]?.safetySheetPath || [];

        const sameProductCount = savedSds.filter((sheet) => {
          const sheetLinkKey = Object.keys(sheet).find((key) => key.endsWith('_link'));
          if (sheetLinkKey && sheet[sheetLinkKey]) {
            const sheetFilePath = sheet[sheetLinkKey];
            const sheetFileName = sheetFilePath.split('/').pop();
            const sheetMatch = sheetFileName.match(/^([^_]+)_(?:web_)?([a-f0-9]{16})\.pdf$/);

            if (sheetMatch) {
              const sheetProductNumber = sheetMatch[1];
              const sheetVendor = sheetFilePath.split('/')[2];

              // Count if same vendor AND same product number
              return sheetVendor === vendorFromPath && sheetProductNumber === productNumber;
            }
          }
          return false;
        }).length;

        // Only show version info if there are multiple files for the same product
        if (sameProductCount > 1) {
          // Find the position of this specific document in the filtered list
          let currentPosition = 1;
          for (let i = 0; i <= index && i < savedSds.length; i++) {
            const sheet = savedSds[i];
            const sheetLinkKey = Object.keys(sheet).find((key) => key.endsWith('_link'));
            if (sheetLinkKey && sheet[sheetLinkKey]) {
              const sheetFilePath = sheet[sheetLinkKey];
              const sheetFileName = sheetFilePath.split('/').pop();
              const sheetMatch = sheetFileName.match(/^([^_]+)_(?:web_)?([a-f0-9]{16})\.pdf$/);

              if (sheetMatch) {
                const sheetProductNumber = sheetMatch[1];
                const sheetVendor = sheetFilePath.split('/')[2];

                if (sheetVendor === vendorFromPath && sheetProductNumber === productNumber) {
                  if (i === index) {
                    break; // Found our position
                  }
                  currentPosition++;
                }
              }
            }
          }
          versionInfo = ` v${currentPosition}`;
        }
      }
    } else {
      // for a search query: extract vendor name from key
      const vendor = linkKey.replace('_link', '').toUpperCase();
      vendorKey = vendor.toLowerCase();
      displayName = vendorDisplayName(vendorKey);
      productInfo = ` - ${document[`${vendor.toLowerCase()}_product_number`] || ''}`;
    }

    const finalDisplayName = `Safety Data Sheet from ${displayName}${productInfo}${versionInfo}`;

    return (
      <div className="d-flex gap-3 align-items-center flex-wrap">
        <div className="d-flex me-auto gap-3 align-items-center flex-wrap">
          {vendorLink ? (
            <a href={vendorLink} target="_blank" rel="noreferrer">
              {finalDisplayName}
              {this.checkMarkButton(document)}
            </a>
          ) : null}
          <ButtonToolbar>
            {this.copyButton(document)}
            {this.saveSafetySheetsButton(document)}
            {this.removeButton(index, document)}
          </ButtonToolbar>
        </div>
        <div className="me-auto">
          {this.renderChemicalProperties(propertyVendorKey(vendorKey))}
        </div>
        <div className="justify-content-end">
          {this.querySafetyPhrases(propertyVendorKey(vendorKey))}
        </div>
      </div>
    );
  };

  // The curated vendors split by what we can actually deliver: a downloadable sheet, or
  // only a catalogue page. The full PubChem list stays one click away rather than rendered.
  renderVendorGroups = () => {
    const { vendorOverview } = this.state;
    if (!vendorOverview) return null;

    const {
      sds_vendors: sdsVendors = [],
      catalogue_vendors: catalogueVendors = [],
      vendor_count: vendorCount,
      pubchem_url: pubchemUrl,
    } = vendorOverview;
    if (!sdsVendors.length && !catalogueVendors.length && !pubchemUrl) return null;

    return (
      <div data-component="vendorGroups">
        {pubchemUrl && (
          <div className="mb-3">
            <OverlayTrigger
              placement="top"
              overlay={(
                <Tooltip id="pubchem-all-vendors">
                  Browse the full vendor list on PubChem, including the ones not curated here
                </Tooltip>
              )}
            >
              <Button
                variant="outline-secondary"
                size="sm"
                href={pubchemUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fa fa-external-link me-2" />
                {`All ${vendorCount} vendors on PubChem`}
              </Button>
            </OverlayTrigger>
          </div>
        )}
        {sdsVendors.length > 0 && (
          <>
            {this.sectionHeader('sdsVendors', 'Safety data sheets', {
              meta: `${sdsVendors.length} vendors`,
              metaTooltip: 'Vendors PubChem lists for this sample whose safety data sheet can be saved here.',
            })}
            {this.isSectionOpen('sdsVendors') && (
              <>
                <div className="text-muted small mb-2">
                  Saving a sheet stores the PDF with the chemical, which is what the AI
                  extraction reads.
                </div>
                <ListGroup className="mb-3">
                  {sdsVendors.map((group) => this.renderVendorGroup(group))}
                </ListGroup>
              </>
            )}
          </>
        )}
        {catalogueVendors.length > 0 && (
          <>
            {this.sectionHeader('catalogueVendors', 'Vendor product pages', {
              meta: `${catalogueVendors.length} vendors`,
              metaTooltip: 'These vendors publish a product page but no sheet we can fetch. '
                + 'Open the page and attach the sheet with Upload SDS.',
            })}
            {this.isSectionOpen('catalogueVendors') && (
              <>
                <div className="text-muted small mb-2">
                  No sheet can be fetched from these. Open the product page and attach the
                  sheet with Upload SDS to make it available for extraction.
                </div>
                <ListGroup className="mb-2">
                  {catalogueVendors.map((group) => this.renderVendorGroup(group))}
                </ListGroup>
              </>
            )}
          </>
        )}
      </div>
    );
  };

  // Every sheet section folds the same way, so the header is built once. Sections start
  // open, which is how they behaved before they could be collapsed.
  sectionHeader(id, title, {
    meta = null, metaTooltip = null, className = '', defaultOpen = true,
  } = {}) {
    const isOpen = this.isSectionOpen(id, defaultOpen);
    const counter = <span className="text-muted small fw-normal ms-2">{meta}</span>;

    return (
      <h6 className={`mt-4 mb-1 ${className}`}>
        <Button
          variant="link"
          size="sm"
          className="p-0 text-decoration-none text-reset align-baseline"
          aria-expanded={isOpen}
          onClick={() => this.toggleSection(id, defaultOpen)}
        >
          <i className={`fa fa-caret-${isOpen ? 'down' : 'right'} me-2`} />
          {title}
        </Button>
        {meta && metaTooltip && (
          <OverlayTrigger placement="top" overlay={<Tooltip id={`${id}-meta`}>{metaTooltip}</Tooltip>}>
            {counter}
          </OverlayTrigger>
        )}
        {meta && !metaTooltip && counter}
      </h6>
    );
  }

  // One shape for every "open this elsewhere" control, so the row reads as a button bar
  // rather than a run of bare links.
  static linkIconButton({ href, icon, tooltip, key }) {
    return (
      <OverlayTrigger key={key} placement="top" overlay={<Tooltip id={`${key}-tip`}>{tooltip}</Tooltip>}>
        <Button
          size="xsm"
          variant="light"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className={`fa ${icon}`} />
        </Button>
      </OverlayTrigger>
    );
  }

  renderVendorGroup = (group) => {
    const { expandedVendors } = this.state;
    const isOpen = !!expandedVendors[group.vendor];

    return (
      <ListGroupItem key={group.vendor}>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Button
            variant="link"
            size="sm"
            className="p-0 text-decoration-none"
            onClick={() => this.toggleVendor(group.vendor)}
          >
            <i className={`fa fa-caret-${isOpen ? 'down' : 'right'} me-2`} />
            {vendorDisplayName(group.vendor)}
          </Button>
          <span className="text-muted small">{`${group.count} products`}</span>
          {group.sds_supported && (
            <OverlayTrigger
              placement="top"
              overlay={(
                <Tooltip id={`sds-badge-${group.vendor}`}>
                  Safety data sheets can be saved from this vendor
                </Tooltip>
              )}
            >
              <span className="badge bg-success">SDS</span>
            </OverlayTrigger>
          )}
        </div>
        {isOpen && this.renderVendorProducts(group)}
      </ListGroupItem>
    );
  };

  static copyTooltip(copied, vendorName) {
    if (copied) return copied.ok ? 'Copied' : 'Could not reach the clipboard';

    return vendorName ? `${vendorName} catalogue number. Click to copy.` : 'Product listing. Click to copy.';
  }

  renderVendorProducts = (group) => {
    const { expandedProducts, copyFeedback } = this.state;
    const showAll = !!expandedProducts[group.vendor];
    const products = showAll ? group.products : group.products.slice(0, PRODUCT_PREVIEW_COUNT);

    // Expanding a long catalogue scrolls in place rather than pushing the saved sheets
    // off the screen; the toggle still collapses it back to the preview.
    const scrolls = showAll && products.length > PRODUCT_PREVIEW_COUNT;

    return (
      <div className="ms-4 mt-2">
        <div className={scrolls ? 'overflow-auto pe-2' : ''} style={scrolls ? { maxHeight: '18rem' } : undefined}>
          {products.map((product, index) => {
            // A vendor group can mix rows whose SDS URL is derivable with rows that only
            // carry a catalogue page, so the SDS controls are decided per product.
            const keys = Object.keys(product);
            const sdsKey = keys.find((key) => key.endsWith('_link') && !key.endsWith('product_link'));
            const numberKey = keys.find((key) => key.endsWith('_product_number'));
            const productLinkKey = keys.find((key) => key.endsWith('product_link'));
            const label = (numberKey && product[numberKey]) || product.label;
            const productLink = productLinkKey && product[productLinkKey];
            const copied = copyFeedback?.value === label ? copyFeedback : null;

            return (
              // eslint-disable-next-line react/no-array-index-key
              <div key={`${label}-${index}`} className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                <OverlayTrigger
                  placement="top"
                  overlay={(
                    <Tooltip id={`product-number-${group.vendor}-${index}`}>
                      {ChemicalTab.copyTooltip(copied, numberKey && vendorDisplayName(group.vendor))}
                    </Tooltip>
                  )}
                >
                  <Badge
                    bg="light"
                    text="dark"
                    role="button"
                    className="border font-monospace fw-normal"
                    onClick={() => this.copyProductNumber(label)}
                  >
                    {/* The badge is monospace, so reserving the label's width in ch keeps
                        the row still while the mark stands in its place. */}
                    <span
                      className="d-inline-block text-center"
                      style={{ minWidth: `${String(label).length}ch` }}
                    >
                      {copied
                        ? <i className={`fa ${copied.ok ? 'fa-check' : 'fa-times'}`} />
                        : label}
                    </span>
                  </Badge>
                </OverlayTrigger>
                {productLink && ChemicalTab.linkIconButton({
                  href: productLink,
                  icon: 'fa-external-link',
                  tooltip: 'Open the product page at the vendor',
                  key: `product-page-${group.vendor}-${index}`,
                })}
                {sdsKey && ChemicalTab.linkIconButton({
                  href: product[sdsKey],
                  icon: 'fa-file-pdf-o',
                  tooltip: 'Open the safety data sheet in a new tab',
                  key: `open-sds-${group.vendor}-${index}`,
                })}
                {sdsKey && this.saveSafetySheetsButton(product)}
              </div>
            );
          })}
        </div>
        {group.products.length > PRODUCT_PREVIEW_COUNT && (
          <Button
            variant="link"
            size="sm"
            className="ps-0"
            onClick={() => this.toggleVendorProducts(group.vendor)}
          >
            {showAll ? 'Show fewer' : `Show ${group.products.length - PRODUCT_PREVIEW_COUNT} more`}
          </Button>
        )}
      </div>
    );
  };

  renderSafetySheets = () => {
    const {
      searchResults,
      chemical,
      displayWell,
      showAllSearchResults,
    } = this.state;

    // Early return if displayWell is false or no chemical data
    if (!displayWell || !chemical) {
      return null;
    }

    // Synchronize data between chemical_data and _chemical_data if needed
    if (chemical.chemical_data?.[0]?.safetySheetPath?.length > 0) {
      // Initialize _chemical_data structure if needed
      if (!chemical._chemical_data) {
        chemical._chemical_data = [{}];
      }

      if (!chemical._chemical_data[0]) {
        chemical._chemical_data[0] = {};
      }

      // Copy safety sheet path if missing or empty
      if (!chemical._chemical_data[0].safetySheetPath
          || chemical._chemical_data[0].safetySheetPath.length === 0) {
        chemical._chemical_data[0].safetySheetPath = JSON.parse(
          JSON.stringify(chemical.chemical_data[0].safetySheetPath)
        );
      }
    }

    // Ensure _chemical_data is properly initialized
    if (!chemical._chemical_data) {
      chemical._chemical_data = [{}];
    } else if (!chemical._chemical_data[0]) {
      chemical._chemical_data[0] = {};
    }

    if (!chemical._chemical_data[0].safetySheetPath) {
      chemical._chemical_data[0].safetySheetPath = [];
    }

    // Get saved safety sheets from chemical data
    const savedSds = chemical._chemical_data[0].safetySheetPath || [];

    // Check if we have search results or saved SDS to display
    const hasSearchResults = Array.isArray(searchResults) && searchResults.length > 0;
    const hasSavedSds = Array.isArray(savedSds) && savedSds.length > 0;

    // The vendor overview renders above this, so its results are not "no sheets".
    const { vendorOverview } = this.state;
    const hasVendorGroups = !!(vendorOverview?.sds_vendors?.length || vendorOverview?.catalogue_vendors?.length);

    if (!hasSearchResults && !hasSavedSds && !hasVendorGroups) {
      return (
        <div data-component="SafetySheets" data-empty="true">
          <ListGroup className="my-3 overflow-auto">
            <ListGroupItem className="border-0">
              <div>
                <p className="pt-2">No safety sheets available</p>
              </div>
            </ListGroupItem>
          </ListGroup>
        </div>
      );
    }

    try {
      // Render search results if we have any
      const shownResults = showAllSearchResults
        ? searchResults
        : searchResults.slice(0, PRODUCT_PREVIEW_COUNT);
      const resultsScroll = showAllSearchResults && searchResults.length > PRODUCT_PREVIEW_COUNT;
      const searchResultsSection = hasSearchResults && (
        <>
          {this.sectionHeader('searchResults', 'Search Results', {
            meta: `${searchResults.length} found`,
            metaTooltip: 'Sheets this search turned up. Saving one copies it into the sample.',
            className: 'text-primary',
          })}
          <div
            className={`border rounded p-2 ${resultsScroll ? 'overflow-auto' : ''}`}
            style={resultsScroll ? { maxHeight: '22rem' } : undefined}
            hidden={!this.isSectionOpen('searchResults')}
          >
            <ol className="list-group list-group-numbered">
              {shownResults.map((document, index) => {
                if (!document) {
                  return null;
                }

                // A vendor with nothing to offer answers with a sentence, not a sheet.
                const isMessage = typeof document === 'string';
                const numberKey = Object.keys(document).find((key) => key.endsWith('_product_number'));
                const key = (!isMessage && numberKey && document[numberKey]) || `search-${index}`;

                return (
                  <li className="list-group-item border-0 d-flex align-items-center" key={key}>
                    {isMessage ? (
                      <div className="ms-2 me-auto text-muted">
                        <i className="fa fa-info-circle me-2" />
                        {document}
                      </div>
                    ) : (
                      <div className="ms-2 me-auto w-100 safety-sheet-width">
                        {this.renderChildElements(document, index)}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
          {this.isSectionOpen('searchResults') && searchResults.length > PRODUCT_PREVIEW_COUNT && (
            <Button
              variant="link"
              size="sm"
              className="ps-0"
              onClick={() => this.setState((prev) => ({ showAllSearchResults: !prev.showAllSearchResults }))}
            >
              {showAllSearchResults
                ? 'Show fewer'
                : `Show ${searchResults.length - PRODUCT_PREVIEW_COUNT} more`}
            </Button>
          )}
        </>
      );

      // Render saved SDS if we have any
      const savedSdsSection = hasSavedSds && (
        <div>
          {this.sectionHeader('savedSds', 'Safety Sheets saved in the database', {
            meta: `${savedSds.length} of ${MAX_SAVED_SDS}`,
            metaTooltip: `A sample holds at most ${MAX_SAVED_SDS} safety data sheets. `
              + 'Searching stays open at the limit; delete one here to save another.',
            className: 'text-success',
          })}
          <div
            className="border rounded p-2 overflow-auto"
            style={{ maxHeight: '22rem' }}
            hidden={!this.isSectionOpen('savedSds')}
          >
            <ol className="list-group list-group-numbered">
              {savedSds.map((document, index) => {
                if (!document) {
                  return null;
                }

                // Find any key that ends with "_link" to find vendor
                const vendorLinkKey = Object.keys(document).find((key) => key.endsWith('_link'));
                const key = vendorLinkKey ? `saved-${vendorLinkKey}-${index}` : `saved-${index}`;

                return (
                  <li className="list-group-item border-0 d-flex align-items-center" key={key}>
                    <div className="ms-2 me-auto w-100 safety-sheet-width">
                      {this.renderChildElements(document, index)}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      );

      // Return the combined content
      return (
        <div
          data-component="SafetySheets"
          data-count={(hasSearchResults ? searchResults.length : 0) + (hasSavedSds ? savedSds.length : 0)}
        >
          {searchResultsSection}
          {savedSdsSection}
        </div>
      );
    } catch (error) {
      console.error('Error rendering safety sheets:', error);
      return null;
    }
  };

  // Nothing fetched or typed yet, so the box has nothing to show and starts folded.
  safetyPhrasesEmpty() {
    const { chemical } = this.state;
    const phrases = chemical?._chemical_data?.[0]?.safetyPhrases;
    if (!phrases) return true;

    const counts = [phrases.h_statements, phrases.p_statements, phrases.pictograms]
      .map((part) => (Array.isArray(part) ? part.length : Object.keys(part || {}).length));

    return counts.every((count) => count === 0);
  }

  renderSafetyPhrases = () => {
    const { chemical } = this.state;
    const phrases = chemical?._chemical_data?.[0]?.safetyPhrases;
    const startsOpen = !this.safetyPhrasesEmpty();

    return (
      <div>
        {this.sectionHeader('safetyPhrases', 'Safety phrases and pictograms', {
          meta: startsOpen ? null : 'none yet',
          metaTooltip: 'No H or P statement and no pictogram is set. '
            + 'Fetch them from a saved sheet, or type them in here.',
          defaultOpen: startsOpen,
        })}
        <div hidden={!this.isSectionOpen('safetyPhrases', startsOpen)}>
          <SafetyPhrasesEditor
            value={phrases}
            onChange={this.handleSafetyPhrasesChange}
          />
        </div>
      </div>
    );
  };

  closePropertiesModal() {
    this.setState({
      viewChemicalPropertiesModal: false,
      viewModalForVendor: ''
    });
  }

  renderChemicalProperties = (vendor) => {
    const { loadingQuerySafetySheets, loadChemicalProperties } = this.state;
    // Only enable for special vendors: merck and thermofischer
    const specialVendor = vendor === 'merck' || vendor === 'thermofischer';

    return (
      <div className="w-100 mt-0 ms-2">
        <InputGroup>
          <OverlayTrigger
            placement="top"
            overlay={(
              <Tooltip id="renderChemProp">
                {specialVendor
                  ? 'Info, if any found, will be copied to properties fields in sample properties tab'
                  : 'Fetching Chemical properties is not available for manually attached safety sheets'}
              </Tooltip>
            )}
          >
            <div>
              <Button
                id="fetch-properties"
                onClick={() => this.fetchChemicalProperties(vendor)}
                disabled={!!loadingQuerySafetySheets || !!loadChemicalProperties.loading || !specialVendor}
                variant="light"
              >
                {loadChemicalProperties.loading === true && loadChemicalProperties.vendor === vendor
                  ? (
                    <div>
                      <i className="fa fa-spinner fa-pulse fa-fw" />
                      <span>Loading...</span>
                    </div>
                  ) : 'fetch Chemical Properties'}
              </Button>
            </div>
          </OverlayTrigger>
          <OverlayTrigger
            placement="top"
            overlay={(
              <Tooltip id="viewChemProp">
                {specialVendor
                  ? 'Click to view fetched chemical properties'
                  : 'Fetching Chemical properties is not available for manually attached safety sheets'}
              </Tooltip>
            )}
          >
            <div>
              <Button
                active
                onClick={() => this.handlePropertiesModal(vendor)}
                variant="light"
                disabled={!specialVendor}
              >
                <i className="fa fa-file-text" />
              </Button>
            </div>
          </OverlayTrigger>
        </InputGroup>
      </div>
    );
  };

  inventoryInformationTab(data) {
    const { switchRequiredOrderedDate } = this.state;

    return (
      <>
        <Row className="mb-3">
          <Col>
            {this.chemicalStatus(data)}
          </Col>
          <Col>
            {this.textInput(data, 'Vendor', 'vendor')}
          </Col>
          <Col>
            {this.textInput(data, 'Order number', 'order_number')}
          </Col>
          <Col>
            {this.textInput(data, 'Product number', 'product_number')}
          </Col>
        </Row>
        <Row className="mb-3">
          <Col sm={3}>
            {this.textInput(data, 'Price', 'price')}
          </Col>
          <Col sm={3}>
            {this.textInput(data, 'Person', 'person')}
          </Col>
          <Col sm={6}>
            <ButtonGroup className="flex-wrap" style={{ marginBottom: '0.79rem' }}>
              <ButtonGroupToggleButton
                onClick={() => this.setState({ switchRequiredOrderedDate: 'required' })}
                active={switchRequiredOrderedDate === 'required'}
                size="xxsm"
              >
                Required date
              </ButtonGroupToggleButton>
              <ButtonGroupToggleButton
                onClick={() => this.setState({ switchRequiredOrderedDate: 'ordered' })}
                active={switchRequiredOrderedDate === 'ordered'}
                size="xxsm"
              >
                Ordered date
              </ButtonGroupToggleButton>
              <ButtonGroupToggleButton
                onClick={() => this.setState({ switchRequiredOrderedDate: 'expiration' })}
                active={switchRequiredOrderedDate === 'expiration'}
                size="xxsm"
              >
                Expiration date
              </ButtonGroupToggleButton>
              <ButtonGroupToggleButton
                onClick={() => this.setState({ switchRequiredOrderedDate: 'delivery' })}
                active={switchRequiredOrderedDate === 'delivery'}
                size="xxsm"
              >
                Delivery date
              </ButtonGroupToggleButton>
              <ButtonGroupToggleButton
                onClick={() => this.setState({ switchRequiredOrderedDate: 'opening' })}
                active={switchRequiredOrderedDate === 'opening'}
                size="xxsm"
              >
                Opening date
              </ButtonGroupToggleButton>
            </ButtonGroup>
            {switchRequiredOrderedDate === 'required' && this.textInput(data, 'Date', 'required_date')}
            {switchRequiredOrderedDate === 'ordered' && this.textInput(data, 'Date', 'ordered_date')}
            {switchRequiredOrderedDate === 'expiration' && this.textInput(data, 'Date', 'expiration_date')}
            {switchRequiredOrderedDate === 'delivery' && this.textInput(data, 'Date', 'delivery_date')}
            {switchRequiredOrderedDate === 'opening' && this.textInput(data, 'Date', 'opening_date')}
          </Col>
        </Row>
        <Row className="mb-3">
          <Col sm={3}>
            {this.numInputWithoutTable(data, 'Amount', 'amount')}
          </Col>
          <Col sm={2} className="pt-2">
            {this.numInputWithoutTable(data, '', 'volume')}
          </Col>
          <Col sm={3}>
            {this.numInputWithoutTable(data, 'Storage Temperature', 'storage_temperature')}
          </Col>
          <Col sm={2}>
            {this.textInput(data, 'Required by', 'required_by')}
          </Col>
          <Col sm={2}>
            {this.textInput(data, 'Inventory Label', 'inventory_label')}
          </Col>
        </Row>
      </>
    );
  }

  locationTab(data) {
    return (
      <>
        <Row className="mb-3">
          <Col>
            {this.locationInput(data, 'host_building', 'host_location')}
          </Col>
          <Col>
            {this.locationInput(data, 'host_room', 'host_location')}
          </Col>
          <Col>
            {this.locationInput(data, 'host_cabinet', 'host_location')}
          </Col>
          <Col>
            {this.locationInput(data, 'host_group', 'host_group')}
          </Col>
          <Col>
            {this.locationInput(data, 'host_owner', 'host_group')}
          </Col>
        </Row>
        <Row className="mb-3">
          <Col>
            {this.locationInput(data, 'current_building', 'current_location')}
          </Col>
          <Col>
            {this.locationInput(data, 'current_room', 'current_location')}
          </Col>
          <Col>
            {this.locationInput(data, 'current_cabinet', 'current_location')}
          </Col>
          <Col>
            {this.locationInput(data, 'current_group', 'current_group')}
          </Col>
          <Col>
            {this.locationInput(data, 'borrowed_by', 'current_group')}
          </Col>
        </Row>
        <div className="mb-3">
          {this.textInput(data, 'Disposal information', 'disposal_info')}
        </div>
        <div>
          {this.textInput(data, 'Important notes', 'important_notes')}
        </div>
      </>
    );
  }

  updateDisplayWell() {
    const { chemical } = this.state;
    if (!chemical) {
      return;
    }

    // Check if chemical data exists and has safety sheet paths
    if (chemical._chemical_data
      && chemical._chemical_data.length !== 0
      && chemical._chemical_data[0].safetySheetPath
      && chemical._chemical_data[0].safetySheetPath.length !== 0) {
      this.setState({ displayWell: true });

      // Initialize dynamic check marks from existing safety sheets
      const dynamicCheckMarks = {};

      // Process each saved safety sheet
      chemical._chemical_data[0].safetySheetPath.forEach((sheet) => {
        // Find any key that ends with "_link", but make sure we check it exists first
        if (sheet && typeof sheet === 'object') {
          // Get all keys that end with "_link"
          const linkKeys = Object.keys(sheet).filter((key) => key.endsWith('_link') && sheet[key]);
          // For each found link key, update the check marks
          linkKeys.forEach((vendorLinkKey) => {
            // Extract vendor name from the link key (e.g., 'merck' from 'merck_link')
            const vendorName = vendorLinkKey.replace('_link', '');
            const normalizedVendorName = vendorName.toLowerCase();

            // Set check mark to true for this vendor
            dynamicCheckMarks[normalizedVendorName] = true;

            if (normalizedVendorName === 'merck') {
              this.setState({ checkSaveIconMerck: true });
            }
          });
        }
      });

      // Update the dynamicCheckMarks state
      this.setState({ dynamicCheckMarks });
    }
  }

  // Searching stays available however many sheets are saved; only the save itself is capped,
  // so a user can always look a sheet up before deciding which saved one to drop.
  querySafetySheetButton() {
    const { loadingQuerySafetySheets } = this.state;
    const isDisabled = !!loadingQuerySafetySheets;

    const button = (
      <Button
        id="submit-sds-btn"
        onClick={() => this.querySafetySheets()}
        variant="light"
        disabled={isDisabled}
      >
        {loadingQuerySafetySheets === false ? 'Search for SDS'
          : (
            <div>
              <i className="fa fa-spinner fa-pulse fa-fw" />
              <span>
                Loading...
              </span>
            </div>
          )}
      </Button>
    );

    const overlay = (
      <Tooltip id="sdsSearchButton">Search the vendor for safety data sheets for this sample</Tooltip>
    );

    return (
      <div className="mt-4">
        {isDisabled ? button : (
          <OverlayTrigger placement="top" overlay={overlay}>
            <div>{button}</div>
          </OverlayTrigger>
        )}
      </div>
    );
  }

  safetyTab() {
    const { displayWell, warningMessage } = this.state;
    return (
      <>
        <Row className="mb-4 align-items-end">
          <Col xs="auto" className="mb-1">
            {this.addAttachment()}
          </Col>
          <Col md={3}>
            {this.chooseVendor()}
          </Col>
          <Col md={3}>
            {this.queryOption()}
          </Col>
          <Col md={2}>
            {this.safetySheetLanguage()}
          </Col>
          <Col>
            {this.querySafetySheetButton()}
          </Col>
        </Row>

        {displayWell && this.renderVendorGroups()}
        {displayWell && this.renderSafetySheets()}
        {warningMessage && this.renderWarningMessage()}
        {this.renderSafetyPhrases()}
      </>
    );
  }

  renderWarningMessage() {
    const { warningMessage } = this.state;
    if (!warningMessage) return null;

    return (
      <div className="text-danger mt-2">
        {warningMessage}
      </div>
    );
  }

  renderPropertiesModal() {
    const { viewChemicalPropertiesModal, chemical, viewModalForVendor } = this.state;
    let fetchedChemicalProperties = 'Please fetch chemical properties first to view results';
    if (viewModalForVendor === 'thermofischer') {
      const condition = chemical._chemical_data[0].alfaProductInfo
      && chemical._chemical_data[0].alfaProductInfo.properties;
      fetchedChemicalProperties = condition
        ? JSON.stringify(chemical._chemical_data[0].alfaProductInfo.properties, null, '\n')
        : fetchedChemicalProperties;
    } else if (viewModalForVendor === 'merck') {
      const condition = chemical._chemical_data[0].merckProductInfo
        && chemical._chemical_data[0].merckProductInfo.properties;
      fetchedChemicalProperties = condition
        ? JSON.stringify(chemical._chemical_data[0].merckProductInfo.properties, null, '\n')
        : fetchedChemicalProperties;
    }

    return (
      <AppModal
        title="Fetched Chemical Properties"
        show={viewChemicalPropertiesModal}
        onHide={() => this.closePropertiesModal()}
        size="lg"
        closeLabel="Close"
        showFooter
      >
        <Form.Group controlId="propertiesModal">
          <Form.Control
            as="textarea"
            className="w-100"
            readOnly
            disabled
            type="text"
            rows={10}
            value={fetchedChemicalProperties}
          />
        </Form.Group>
      </AppModal>
    );
  }

  render() {
    const {
      chemical,
      showModal,
    } = this.state;
    const { type } = this.props;

    const data = chemical?._chemical_data?.[0] ?? [];
    return (
      <>
        <Accordion
          alwaysOpen
          defaultActiveKey={[
            'inventoryInformationTab',
            'safetyTab',
            'locationTab',
          ]}
        >
          <Accordion.Item eventKey="inventoryInformationTab">
            <Accordion.Header>Inventory Information</Accordion.Header>
            <Accordion.Body>
              {this.inventoryInformationTab(data)}
            </Accordion.Body>
          </Accordion.Item>

          {type === 'sample' && (
            <Accordion.Item eventKey="safetyTab">
              <Accordion.Header>Safety</Accordion.Header>
              <Accordion.Body>
                {this.safetyTab()}
              </Accordion.Body>
            </Accordion.Item>
          )}

          <Accordion.Item eventKey="locationTab">
            <Accordion.Header>Location and Information</Accordion.Header>
            <Accordion.Body>
              {this.locationTab(data)}
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>

        {this.renderPropertiesModal()}

        <SDSAttachmentModal
          show={showModal}
          onHide={() => this.setState({ showModal: false })}
          onSubmit={this.submitManualAttachment}
        />
      </>
    );
  }
}

ChemicalTab.propTypes = {
  sample: PropTypes.object,
  type: PropTypes.string.isRequired,
  handleUpdateSample: PropTypes.func,
  saveInventory: PropTypes.bool.isRequired,
  setSaveInventory: PropTypes.func.isRequired,
  editChemical: PropTypes.func.isRequired,
  onInventorySaveComplete: PropTypes.func,
};

ChemicalTab.defaultProps = {
  handleUpdateSample: null,
  onInventorySaveComplete: null,
};
