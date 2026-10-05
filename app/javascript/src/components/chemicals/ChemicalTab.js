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
import SafetyPhrasesEditor, { SafetyPhrasesCopyButton } from 'src/components/chemicals/SafetyPhrasesEditor';
import CopyButton from 'src/components/common/CopyButton';
import { formatProperties } from 'src/utilities/sdsClipboardFormat';
import Chemical from 'src/models/Chemical';
import { StoreContext } from 'src/stores/mobx/RootStore';

// Tooltips render into the body, not into the scrolling sheet lists they belong to,
// where growing the page would move the row out from under the cursor.
const TOOLTIP_CONTAINER = () => document.body;

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

// How long the badge shows the outcome of a copy before returning to its resting state.
const COPY_FEEDBACK_MS = 1600;

// What to tell the user when the field the chosen option searches on is empty.
const MISSING_QUERY_HINT = {
  'Product Number': 'Add a product number in Inventory Information, or search by CAS or common name.',
  CAS: 'Assign a CAS number in the labels section, or search by common name.',
  'Common Name': 'This sample has no molecule name yet, so there is nothing to search with.',
};

// Links come out of stored chemical_data, which any client can write, so only a web URL
// or a saved sheet path is rendered as an href; anything else renders as no link.
const safeHref = (value) => {
  const href = String(value ?? '').trim();
  return /^https?:\/\//i.test(href) || href.startsWith('/safety_sheets/') ? href : null;
};

// Cf. ChemicalsService.generate_safety_sheet_file_path; older sheets carry a _web_ marker.
const SAVED_SHEET_FILE = /^([^_]+)_(?:web_)?[a-f0-9]{16}\.pdf$/;

// "/safety_sheets/<vendor>/<productNumber>_<hash>.pdf"; productNumber is null for other names.
const parseSavedSheetPath = (path) => {
  const parts = String(path).split('/');
  const match = parts[parts.length - 1].match(SAVED_SHEET_FILE);
  return { vendor: parts[2] || '', productNumber: match ? match[1] : null };
};

// Cf. Chemotion::ChemicalsService.safety_sheet_disk_path, which refuses any other path.
const EXTRACTABLE_SHEET = /^\/safety_sheets\/[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+\.pdf$/;

// The display string SdsValueParser builds: "12 - 13 °C (1013 hPa)", "-98 °C", "0.79 g/cm3".
const SHEET_QUANTITY = /^(-?\d+(?:\.\d+)?)(?: - (-?\d+(?:\.\d+)?))?(?: ([^\s(]+))?(?: \(.*\))?$/;
const parseSheetQuantity = (display) => {
  const match = String(display ?? '').match(SHEET_QUANTITY);
  if (!match) return null;
  const low = parseFloat(match[1]);
  return { low, high: match[2] === undefined ? low : parseFloat(match[2]), unit: match[3] || null };
};

// Sample density is g/mL; a unitless value is a specific gravity, which equals it numerically.
const DENSITY_UNITS = [null, 'g/cm3', 'g/cm³', 'g/mL', 'g/ml', 'kg/L'];

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
      extractingSheet: '',
      switchRequiredOrderedDate: 'required',
      viewChemicalPropertiesModal: false,
      viewPropertiesForSheet: '',
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
    this.unmounted = true;
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

  handlePropertiesModal(sheetPath) {
    this.setState({
      viewChemicalPropertiesModal: true,
      viewPropertiesForSheet: sheetPath
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

  // The request for the current search, or null once the user is told what is missing.
  // Checked before any request, so an empty CAS or name is reported rather than sent.
  buildSafetySheetQuery() {
    const { sample } = this.props;
    const { vendorValue, queryOption, safetySheetLanguage } = this.state;

    const searchStr = this.queryValueFor(queryOption);
    if (!searchStr) {
      this.notifyMissingQueryValue(queryOption);
      return null;
    }

    // PubChem is reached by the molecule either way; a product number only narrows the
    // vendor listing it returns, so the identifier still has to come from the sample.
    const byNumber = queryOption === 'Product Number';
    const identifier = byNumber
      ? (sample.xref?.cas || sample.molecule_name_hash?.label || '')
      : searchStr;
    if (!identifier) {
      this.notifyMissingQueryValue('CAS');
      return null;
    }

    return {
      id: sample.molecule_name_hash?.mid ?? null,
      vendor: vendorValue,
      queryOption,
      language: safetySheetLanguage,
      string: identifier,
      productNumber: byNumber ? searchStr : null
    };
  }

  // The fetch_safetysheet answer as state: an All vendors overview, one vendor's rows, or
  // null for a failed request.
  static searchStateFromResponse(response) {
    if (response?.sds_vendors || response?.catalogue_vendors) {
      // A search that found nothing reads the same here as it does for one vendor.
      const nothingFound = !response.sds_vendors?.length && !response.catalogue_vendors?.length;
      return {
        vendorOverview: nothingFound ? null : response,
        searchResults: nothingFound && response.message ? [response.message] : [],
      };
    }
    if (response !== null && response !== undefined) {
      return { searchResults: Object.values(response), vendorOverview: null };
    }
    return {
      searchResults: [],
      vendorOverview: null,
      warningMessage: 'The vendor did not return any safety data sheets for this sample.',
    };
  }

  querySafetySheets = () => {
    const queryParams = this.buildSafetySheetQuery();
    if (!queryParams) return;

    const { sample } = this.props;
    const { chemical } = this.state;
    if (chemical) {
      chemical.buildChemical('sample_name', sample.showedName());
      chemical.buildChemical('molecule_id', queryParams.id);
    }

    this.setState({ loadingQuerySafetySheets: true, warningMessage: '' });
    ChemicalFetcher.fetchSafetySheets(queryParams).then((result) => {
      this.setState({
        ...ChemicalTab.searchStateFromResponse(JSON.parse(result)),
        loadingQuerySafetySheets: false,
        displayWell: true,
      });
    }).catch((errorMessage) => {
      console.log(errorMessage);
      this.setState({ loadingQuerySafetySheets: false });
    });
  };

  handleSafetyPhrasesChange = (next) => {
    this.handleFieldChanged('safetyPhrases', next);
  };

  // One pass over the saved PDF: H and P codes land on the chemical, section 9 values on
  // the sample. Cf. Chemotion::SdsExtractor.
  // A result arriving after unmount belongs to a sample no longer shown, so it is dropped.
  extractFromSheet = (sheetPath) => {
    const { extractingSheet } = this.state;
    if (extractingSheet) return Promise.resolve();

    this.setState({ warningMessage: '', extractingSheet: sheetPath });

    return ChemicalFetcher.extractFromSds(sheetPath, { cancelled: () => this.unmounted }).then((result) => {
      if (this.unmounted) return;
      if (result?.error) throw new Error(result.error);

      this.setState({ extractingSheet: '' });
      const properties = result?.properties ?? {};
      const phrases = result?.safetyPhrases;
      const codeCount = phrases
        ? Object.keys(phrases.h_statements ?? {}).length + Object.keys(phrases.p_statements ?? {}).length
        : 0;

      if (!codeCount && !Object.keys(properties).length) {
        this.setState({ warningMessage: ChemicalTab.extractionWarning(result) });
        return;
      }

      this.handleFieldChanged('sdsExtractedProperties', { ...this.allExtractedProperties(), [sheetPath]: properties });
      const replacedPhrases = codeCount > 0 && !this.safetyPhrasesEmpty();
      if (codeCount) this.handleFieldChanged('safetyPhrases', phrases);
      const mapped = this.mapToSampleProperties(properties);
      this.notify(ChemicalTab.extractionSummary(result, codeCount, replacedPhrases, mapped));
    }).catch((error) => {
      if (this.unmounted) return;
      console.log(error);
      this.setState({
        extractingSheet: '',
        warningMessage: error?.message
          ? `Could not read this safety data sheet: ${error.message}`
          : 'Could not read this safety data sheet'
      });
    });
  };

  // Says what was overwritten, and flags phrases matched from wording since no code was printed.
  static extractionSummary(result, codeCount, replacedPhrases, { written, skipped }) {
    const phrases = result?.diagnostics?.phrases ?? {};
    const fromWording = codeCount > 0 && phrases.source === 'wording';
    const unmatched = (phrases.unmatched_statements ?? []).length;
    const parts = [];
    if (!codeCount) parts.push('No H or P phrases found; the existing ones are kept');
    if (codeCount) {
      parts.push(`${codeCount} H and P phrases ${replacedPhrases ? 'replaced the previous ones' : 'filled in'}`);
    }
    if (fromWording) {
      parts.push('The sheet prints no codes, so they were matched from the statement wording; check them');
    }
    if (fromWording && unmatched) parts.push(`${unmatched} statements matched no known phrase`);
    if (written.length) parts.push(`Sample properties set: ${written.join(', ')}`);
    if (skipped.length) parts.push(`Not in a unit the sample takes: ${skipped.join(', ')}`);

    return {
      title: 'Read from the safety data sheet',
      message: `${parts.join('. ')}.`,
      level: fromWording ? 'warning' : 'success',
      position: 'tc',
    };
  }

  // The extractor omits rather than guesses, so say which step stopped short.
  static extractionWarning(result) {
    const diagnostics = result?.diagnostics ?? {};
    const reason = (diagnostics.errors ?? [])[0] ?? (diagnostics.notes ?? [])[0];
    return reason
      ? `Nothing could be read from this sheet: ${reason}`
      : 'Nothing could be read from this sheet';
  }

  // Sigma-Aldrich refuses the server's own request but serves the sheet with
  // access-control-allow-origin *, so the browser reads it and hands us the bytes.
  fetchSdsInBrowser = ({ sdsLink, productNumber, productLink }, vendorName) => ChemicalFetcher
    .fetchVendorSheet(sdsLink, `${productNumber}.pdf`)
    .then((attachedFile) => this.handleAttachmentSubmit({
      productNumber,
      vendorName,
      attachedFile,
      productLink,
      safetySheetLink: sdsLink,
    }));

  // Runs each route until one succeeds. A final refusal ends the chain; otherwise the first
  // failure is the one reported, once every route is spent.
  static tryRoutesInOrder(routes, runRoute) {
    const attempt = (index, firstError) => {
      if (index >= routes.length) {
        return Promise.reject(firstError || new Error('no save route is available'));
      }

      return Promise.resolve().then(() => runRoute(routes[index])).catch((error) => (
        error?.final ? Promise.reject(error) : attempt(index + 1, firstError || error)
      ));
    };
    return attempt(0, null);
  }

  setSavingSheet(productNumber, saving) {
    this.setState((prev) => ({
      loadingSaveSafetySheets: { ...prev.loadingSaveSafetySheets, [productNumber]: saving },
    }));
  }

  // A refused save has nothing to retry, so it offers no manual upload either: that route
  // would refuse it for the same reason.
  notifySaveFailure(error) {
    const refused = !!error?.final;
    this.notify({
      title: refused ? 'Sheet not saved' : 'Could not save the safety data sheet',
      message: refused
        ? error.message
        : `${error.message}. Open the sheet and attach it with Upload SDS instead.`,
      level: refused ? 'warning' : 'error',
      position: 'tc',
    });
  }

  // Routes come in the order the backend ranked them. Cf. ChemicalsService.vendor_save_modes.
  saveSdsViaRoutes = (routes, productInfo, vendorName) => {
    if (this.atSavedSdsLimit()) {
      this.notifySavedSdsLimit();
      return Promise.resolve();
    }

    const { productNumber } = productInfo;
    this.setSavingSheet(productNumber, true);

    return ChemicalTab.tryRoutesInOrder(routes, (route) => (route === 'browser'
      ? this.fetchSdsInBrowser(productInfo, vendorName)
      : this.fetchSdsOnServer(productInfo)))
      .catch((error) => this.notifySaveFailure(error))
      .finally(() => this.setSavingSheet(productNumber, false));
  };

  // The save_manual_sds request body. Cf. ChemicalApi save_manual_sds params.
  static buildAttachmentForm({
    sample, chemicalData, productNumber, vendorName, attachedFile, productLink, safetySheetLink,
  }) {
    const vendorInfo = { productNumber, vendor: vendorName };
    if (productLink) vendorInfo.productLink = productLink;
    if (safetySheetLink) vendorInfo.sdsLink = safetySheetLink;

    const data = new FormData();
    data.append('sample_id', sample.id);
    data.append('cas', sample.xref?.cas ?? '');
    data.append('vendor_info', JSON.stringify(vendorInfo));
    data.append('vendor_name', vendorName);
    data.append('vendor_product', `${vendorName.toLowerCase().trim()}ProductInfo`);
    data.append('attached_file', attachedFile);
    if (chemicalData) data.append('chemical_data', JSON.stringify(chemicalData));
    return data;
  }

  // Clearing the results moves the row into the saved list instead of leaving a duplicate
  // of it under Search Results with a dead save button.
  adoptSavedChemical(savedChemical) {
    const { editChemical } = this.props;
    const chemicalInstance = new Chemical(savedChemical);
    this.setState({ chemical: chemicalInstance, searchResults: [] });
    editChemical(false);
    chemicalInstance.updateChecksum();
  }

  // Rejects rather than notifying, so saveSdsViaRoutes can fall through to the next route.
  handleAttachmentSubmit = (attachment) => {
    const { sample } = this.props;
    const { chemical } = this.state;
    const data = ChemicalTab.buildAttachmentForm({
      ...attachment, sample, chemicalData: chemical?._chemical_data?.[0],
    });

    if (!chemical) this.setState({ chemical: new Chemical({ _chemical_data: [{}] }) });
    this.setState({ showModal: false });

    return ChemicalFetcher.saveManualAttachedSafetySheet(data)
      .then((updatedChemical) => {
        if (!updatedChemical) throw new Error('the server did not return the saved sheet');
        if (updatedChemical.error) throw new Error(updatedChemical.error);
        this.adoptSavedChemical(updatedChemical);
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
  // Returns the labels written and those whose unit the sample field cannot hold.
  // Only a Sample has the range and xref fields these map onto; an SBMM sample gets none.
  mapToSampleProperties(properties) {
    const { sample, handleUpdateSample } = this.props;
    const written = [];
    const skipped = [];
    if (!(sample instanceof Sample)) return { written, skipped };

    // Melting, boiling and flash point fields are Celsius only.
    const celsius = (key, label) => {
      if (!properties[key]) return null;
      const quantity = parseSheetQuantity(properties[key]);
      if (quantity?.unit === '°C') return quantity;
      skipped.push(label);
      return null;
    };

    [['boiling_point', 'boiling point'], ['melting_point', 'melting point']].forEach(([key, label]) => {
      const quantity = celsius(key, label);
      if (!quantity) return;
      sample.updateRange(key, quantity.low, quantity.high);
      written.push(label);
    });

    const flashPoint = celsius('flash_point', 'flash point');
    if (flashPoint) {
      sample.xref.flash_point = { unit: '°C', value: flashPoint.low };
      written.push('flash point');
    }

    if (properties.density) {
      const density = parseSheetQuantity(properties.density);
      if (density && density.low === density.high && DENSITY_UNITS.includes(density.unit)) {
        sample.density = density.low;
        written.push('density');
      } else {
        skipped.push('density');
      }
    }

    [['form', 'form'], ['color', 'color'], ['refractive_index', 'refractive index'], ['solubility', 'solubility']]
      .forEach(([key, label]) => {
        if (!properties[key]) return;
        sample.xref[key] = properties[key];
        written.push(label);
      });

    if (handleUpdateSample && written.length) {
      handleUpdateSample(sample);
      ElementActions.updateSample(new Sample(sample), false);
    }
    return { written, skipped };
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
      <OverlayTrigger container={TOOLTIP_CONTAINER}
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
    value = safeHref(value);

    const tooltipMessage = value ? `product link (${value})` : 'No product link available';

    return (
      <OverlayTrigger
        container={TOOLTIP_CONTAINER}
        placement="bottom"
        overlay={<Tooltip id="productLink_button">{tooltipMessage}</Tooltip>}
      >
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

  // Saved sheets are keyed "<productNumber>_<hash>_link": a search row is held when a sheet
  // for its own product number is, a saved row (no product number) by its stored path.
  isSheetHeld(sdsInfo) {
    const { chemical } = this.state;
    const linkKey = Object.keys(sdsInfo || {}).find((key) => key.endsWith('_link'));
    if (!linkKey) return false;

    const sdsLink = sdsInfo[linkKey];
    const productNumber = sdsInfo[`${linkKey.replace('_link', '')}_product_number`];
    const savedSheets = chemical?._chemical_data?.[0]?.safetySheetPath || [];
    return savedSheets.some((sheet) => Object.keys(sheet).some(
      (key) => (!!productNumber && key.startsWith(`${productNumber}_`))
        || (!!sdsLink && sheet[key] === sdsLink)
    ));
  }

  checkMarkButton(document) {
    const dynamicKey = Object.keys(document).find((key) => key.endsWith('_link'));
    if (!dynamicKey) {
      return null;
    }

    const vendorName = dynamicKey.replace('_link', '');

    if (document[dynamicKey] && this.isSheetHeld(document)) {
      return (
        <OverlayTrigger container={TOOLTIP_CONTAINER}
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
      <OverlayTrigger container={TOOLTIP_CONTAINER}
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
    const { sample } = this.props;
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
      this.adoptSavedChemical(updatedChemical);
    });
  };

  saveSafetySheetsButton(sdsInfo) {
    const { loadingSaveSafetySheets } = this.state;

    // Find any key that ends with "_link" to determine vendor
    const vendorLinkKey = Object.keys(sdsInfo).find((key) => key.endsWith('_link'));
    if (!vendorLinkKey) {
      return null;
    }

    // A saved row carries no save_modes and shows a server save; [] means nothing to save.
    const saveModes = sdsInfo.save_modes || ['server'];
    if (saveModes.length === 0) {
      return null;
    }

    // Extract vendor information
    const vendorName = vendorLinkKey.replace('_link', '');
    const sdsLink = sdsInfo[vendorLinkKey];
    const productNumberKey = `${vendorName}_product_number`;
    const productLinkKey = `${vendorName}_product_link`;
    const productNumber = sdsInfo[productNumberKey];
    const productLink = sdsInfo[productLinkKey];

    // Determine vendor display name (capitalize first letter)
    const displayVendorName = vendorName.charAt(0).toUpperCase() + vendorName.slice(1);

    const isSaved = this.isSheetHeld(sdsInfo);

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
      <OverlayTrigger container={TOOLTIP_CONTAINER}
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
      <OverlayTrigger container={TOOLTIP_CONTAINER}
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
          <OverlayTrigger container={TOOLTIP_CONTAINER}
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

  // What a sheet row shows: its link, and a title with " vN" when the sample holds several
  // sheets for one vendor and number.
  static describeSheet(document, index, savedSds) {
    const linkKey = Object.keys(document).find((key) => key.endsWith('_link')
      && !key.includes('_product_link') && document[key]);
    const link = linkKey ? safeHref(document[linkKey]) : null;
    if (!link) return { link: null, title: 'Safety Data Sheet from queried vendor' };

    if (!link.includes('/safety_sheets/')) {
      const vendorKey = linkKey.replace('_link', '').toLowerCase();
      const number = document[`${vendorKey}_product_number`] || '';
      return { link, title: `Safety Data Sheet from ${vendorDisplayName(vendorKey)} - ${number}` };
    }

    const { vendor, productNumber } = parseSavedSheetPath(link);
    const name = vendor ? vendorDisplayName(vendor) : 'queried vendor';
    if (!productNumber) return { link, title: `Safety Data Sheet from ${name}` };

    const isSameProduct = (sheet) => {
      const path = Object.entries(sheet || {}).find(([key, value]) => key.endsWith('_link') && value)?.[1];
      if (!path) return false;
      const other = parseSavedSheetPath(path);
      return other.vendor === vendor && other.productNumber === productNumber;
    };
    const version = savedSds.filter(isSameProduct).length > 1
      ? ` v${savedSds.slice(0, index).filter(isSameProduct).length + 1}`
      : '';
    return { link, title: `Safety Data Sheet from ${name} - ${productNumber}${version}` };
  }

  renderChildElements = (document, index) => {
    if (!document) {
      return null;
    }

    const { chemical } = this.state;
    const savedSds = chemical?._chemical_data?.[0]?.safetySheetPath || [];
    const { link, title } = ChemicalTab.describeSheet(document, index, savedSds);

    return (
      <div className="d-flex gap-3 align-items-center flex-wrap">
        <div className="d-flex me-auto gap-3 align-items-center flex-wrap">
          {link ? (
            <a href={link} target="_blank" rel="noreferrer">
              {title}
              {this.checkMarkButton(document)}
            </a>
          ) : null}
          <ButtonToolbar>
            {this.copyButton(document)}
            {this.saveSafetySheetsButton(document)}
            {this.removeButton(index, document)}
          </ButtonToolbar>
        </div>
        <div className="justify-content-end">
          {this.renderSdsExtraction(link)}
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
            <OverlayTrigger container={TOOLTIP_CONTAINER}
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
                  No sheet could be fetched from these. Open the product page, find and download
                  the safety sheet, then upload it using the attach button.
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
    meta = null, metaTooltip = null, className = '', defaultOpen = true, actions = null,
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
          <OverlayTrigger
            container={TOOLTIP_CONTAINER}
            placement="top"
            overlay={<Tooltip id={`${id}-meta`}>{metaTooltip}</Tooltip>}
          >
            {counter}
          </OverlayTrigger>
        )}
        {meta && !metaTooltip && counter}
        {actions}
      </h6>
    );
  }

  // One shape for every "open this elsewhere" control, so the row reads as a button bar
  // rather than a run of bare links.
  static safeHref(value) {
    return safeHref(value);
  }

  static linkIconButton({ href, icon, tooltip, key }) {
    return (
      <OverlayTrigger
        container={TOOLTIP_CONTAINER}
        key={key}
        placement="top"
        overlay={<Tooltip id={`${key}-tip`}>{tooltip}</Tooltip>}
      >
        <Button
          size="xsm"
          variant="light"
          href={safeHref(href)}
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
            <OverlayTrigger container={TOOLTIP_CONTAINER}
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

  // The mark on the badge reports the copy; the tooltip keeps saying what a click does.
  static copyTooltip(vendorName) {
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
                <OverlayTrigger container={TOOLTIP_CONTAINER}
                  placement="top"
                  overlay={(
                    <Tooltip id={`product-number-${group.vendor}-${index}`}>
                      {ChemicalTab.copyTooltip(numberKey && vendorDisplayName(group.vendor))}
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

  // Mirrors the stored sheets into the _chemical_data the tab edits, and guarantees the
  // safetySheetPath array every renderer reads.
  static ensureSafetySheetPath(chemical) {
    if (!chemical._chemical_data) {
      chemical._chemical_data = [{}];
    } else if (!chemical._chemical_data[0]) {
      chemical._chemical_data[0] = {};
    }

    const editable = chemical._chemical_data[0];
    const stored = chemical.chemical_data?.[0]?.safetySheetPath;
    if (stored?.length > 0 && !editable.safetySheetPath?.length) {
      editable.safetySheetPath = JSON.parse(JSON.stringify(stored));
    }
    if (!editable.safetySheetPath) editable.safetySheetPath = [];
    return editable.safetySheetPath;
  }

  renderSearchResultsSection() {
    const { searchResults, showAllSearchResults } = this.state;
    const shownResults = showAllSearchResults
      ? searchResults
      : searchResults.slice(0, PRODUCT_PREVIEW_COUNT);
    const resultsScroll = showAllSearchResults && searchResults.length > PRODUCT_PREVIEW_COUNT;
    return (
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
  }

  renderSavedSdsSection(savedSds) {
    return (
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
  }

  renderSafetySheets = () => {
    const {
      searchResults, chemical, displayWell, vendorOverview,
    } = this.state;
    if (!displayWell || !chemical) {
      return null;
    }

    const savedSds = ChemicalTab.ensureSafetySheetPath(chemical);
    const hasSearchResults = Array.isArray(searchResults) && searchResults.length > 0;
    const hasSavedSds = savedSds.length > 0;
    // The vendor overview renders above this, so its results are not "no sheets".
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
      return (
        <div
          data-component="SafetySheets"
          data-count={(hasSearchResults ? searchResults.length : 0) + savedSds.length}
        >
          {hasSearchResults && this.renderSearchResultsSection()}
          {hasSavedSds && this.renderSavedSdsSection(savedSds)}
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
          meta: startsOpen ? null : 'none added yet',
          metaTooltip: 'No H or P statement and no pictogram is set. '
            + 'Fetch them from a saved sheet, or type them in here.',
          defaultOpen: startsOpen,
          actions: <SafetyPhrasesCopyButton value={phrases} />,
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
      viewPropertiesForSheet: ''
    });
  }

  // Kept on the chemical, keyed by sheet path, so the view survives a reload once the chemical is saved.
  allExtractedProperties() {
    const { chemical } = this.state;
    const stored = chemical?._chemical_data?.[0]?.sdsExtractedProperties;
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
  }

  extractedPropertiesFor(sheetPath) {
    return sheetPath ? this.allExtractedProperties()[sheetPath] : undefined;
  }

  // Reads the saved PDF itself, so it works for a manually attached sheet as much as a
  // fetched one. A search result has no file yet, hence the saved-path gate.
  renderSdsExtraction = (sheetPath) => {
    const { loadingQuerySafetySheets, extractingSheet } = this.state;
    const extracted = this.extractedPropertiesFor(sheetPath);
    const isSaved = EXTRACTABLE_SHEET.test(sheetPath || '');
    const isLoading = extractingSheet === sheetPath;
    const hint = isSaved
      ? 'Reads H and P phrases and section 9 properties out of the saved sheet'
      : 'Save the safety data sheet first';

    return (
      <div className="w-100 mt-0 ms-2">
        <InputGroup>
          <OverlayTrigger container={TOOLTIP_CONTAINER}
            placement="top"
            overlay={<Tooltip id="extractSds">{hint}</Tooltip>}
          >
            <div>
              <Button
                id="extract-sds"
                onClick={() => this.extractFromSheet(sheetPath)}
                disabled={!isSaved || !!extractingSheet || !!loadingQuerySafetySheets}
                variant="light"
              >
                {isLoading ? (
                  <div>
                    <i className="fa fa-spinner fa-pulse fa-fw" />
                    <span>Reading sheet...</span>
                  </div>
                ) : 'Extract from sheet'}
              </Button>
            </div>
          </OverlayTrigger>
          <OverlayTrigger container={TOOLTIP_CONTAINER}
            placement="top"
            overlay={(
              <Tooltip id="viewChemProp">
                {extracted
                  ? 'Click to view the properties read from this sheet'
                  : 'Extract from this sheet first'}
              </Tooltip>
            )}
          >
            <div>
              <Button
                active
                onClick={() => this.handlePropertiesModal(sheetPath)}
                variant="light"
                disabled={!extracted}
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
          <OverlayTrigger container={TOOLTIP_CONTAINER} placement="top" overlay={overlay}>
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
    const { viewChemicalPropertiesModal, viewPropertiesForSheet } = this.state;
    const properties = this.extractedPropertiesFor(viewPropertiesForSheet);
    const fetchedChemicalProperties = properties
      ? JSON.stringify(properties, null, '\n')
      : 'Please extract from a safety data sheet first to view results';
    const copy = formatProperties(properties);

    return (
      <AppModal
        title={(
          <span className="d-inline-flex align-items-center">
            Fetched Chemical Properties
            <CopyButton
              text={copy.text}
              html={copy.html}
              disabled={!copy.text}
              variant="link"
              size="sm"
              className="p-0 ms-2 border-0 lh-1 text-muted"
              tooltip="Copy all properties"
              tooltipId="chemical-properties-copy-tooltip"
              ariaLabel="Copy all properties"
            />
          </span>
        )}
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
