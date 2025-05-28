/* eslint-disable no-underscore-dangle */
import React from 'react';
import PropTypes from 'prop-types';
import {
  Accordion, Form, Button, OverlayTrigger, Tooltip, ButtonToolbar,
  ListGroup, ListGroupItem, InputGroup, Modal, Row, Col,
  ButtonGroup
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import { chemicalStatusOptions } from 'src/components/staticDropdownOptions/options';
import SVG from 'react-inlinesvg';
import ChemicalFetcher from 'src/fetchers/ChemicalFetcher';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import Sample from 'src/models/Sample';
import NumericInputUnit from 'src/apps/mydb/elements/details/NumericInputUnit';
import ButtonGroupToggleButton from 'src/components/common/ButtonGroupToggleButton';
import SDSAttachmentModal from 'src/components/chemicals/SDSAttachmentModal';
import Chemical from 'src/models/Chemical';

export default class ChemicalTab extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      chemical: undefined,
      displayWell: false,
      checkSaveIconThermofischer: false,
      checkSaveIconMerck: false,
      dynamicCheckMarks: {},
      vendorValue: 'Merck',
      queryOption: 'CAS',
      safetySheetLanguage: 'en',
      safetyPhrases: '',
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
    const { chemical } = this.state;
    const { editChemical } = this.props;
    if (chemical) {
      chemical.buildChemical(parameter, value);
      editChemical(chemical.isEdited);
    }
    this.setState({ chemical });
  }

  handleSubmitSave() {
    const { chemical } = this.state;
    const {
      sample,
      setSaveInventory,
      editChemical,
    } = this.props;
    if (!sample || !chemical) {
      return;
    }
    const chemicalData = chemical._chemical_data || null;
    const cas = sample.xref?.cas ?? '';
    const params = {
      chemical_data: chemicalData,
      cas,
      sample_id: sample.id
    };
    if (chemical.isNew) {
      ChemicalFetcher.create(params).then((response) => {
        if (response) {
          this.setState({ chemical });
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
      chemical.isNew = false;
      editChemical(false);
      chemical.updateChecksum();
    } else {
      ChemicalFetcher.update(params).then((response) => {
        if (response) {
          editChemical(false);
          chemical.updateChecksum();
          this.setState({ chemical });
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    }
    setSaveInventory(false);
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
          const vendorName = dynamicKey.replace('_link', '');
          const normalizedVendorName = vendorName.toLowerCase();

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

            // Reset check mark state for this vendor
            if (normalizedVendorName === 'thermofischer' || normalizedVendorName === 'alfa') {
              this.setState({ checkSaveIconThermofischer: false });
            } else if (normalizedVendorName === 'merck') {
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
    // Normalize vendor name for consistency
    const normalizedVendor = vendor.toLowerCase();

    // Handle the existing vendor cases for backward compatibility
    if (normalizedVendor === 'thermofisher' || normalizedVendor === 'alfa') {
      this.setState({ checkSaveIconThermofischer: isNew !== null ? isNew : true });
    } else if (normalizedVendor === 'merck') {
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

  handleVendorOption(value) {
    this.setState({ vendorValue: value });
  }

  handleQueryOption(value) {
    this.setState({ queryOption: value });
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

  querySafetySheets = () => {
    const { sample } = this.props;
    this.setState({ loadingQuerySafetySheets: true });
    const sampleName = sample.showedName();
    const moleculeId = sample.molecule_name_hash?.mid ?? null;
    const {
      chemical, vendorValue, queryOption, safetySheetLanguage
    } = this.state;
    if (chemical) {
      chemical.buildChemical('sample_name', sampleName);
      chemical.buildChemical('molecule_id', moleculeId);
    }
    let searchStr;

    if (queryOption === 'Common Name') {
      searchStr = sample.molecule_name_hash.label;
    } else {
      const sampleCas = sample.xref?.cas ?? '';
      searchStr = sampleCas;
    }

    const queryParams = {
      id: moleculeId,
      vendor: vendorValue.value || vendorValue,
      queryOption,
      language: safetySheetLanguage,
      string: searchStr
    };

    ChemicalFetcher.fetchSafetySheets(queryParams).then((result) => {
      const obj = JSON.parse(result);
      if (obj !== null && obj !== undefined) {
        const newResults = Object.values(obj);
        this.setState({
          searchResults: newResults,
          loadingQuerySafetySheets: false,
          displayWell: true
        });
      } else {
        this.setState({
          searchResults: ['mockValue'],
          loadingQuerySafetySheets: false,
          displayWell: true
        });
      }
    }).catch((errorMessage) => {
      console.log(errorMessage);
      this.setState({ loadingQuerySafetySheets: false });
    });
  };

  // eslint-disable-next-line class-methods-use-this
  stylePhrases = (str) => {
    const HazardPhrases = [];
    if (str && str.h_statements && str.h_statements.length !== 0) {
      // eslint-disable-next-line no-restricted-syntax
      for (const [key, value] of Object.entries(str.h_statements)) {
        // eslint-disable-next-line react/jsx-one-expression-per-line
        const st = <p key={key}> {key}:{value} </p>;
        HazardPhrases.push(st);
      }
    }

    const precautionaryPhrases = [];
    if (str && str.p_statements && str?.p_statements?.length !== 0) {
      // eslint-disable-next-line no-restricted-syntax
      for (const [key, value] of Object.entries(str?.p_statements || {})) {
        // eslint-disable-next-line react/jsx-one-expression-per-line
        const st = <p key={key}>{key}:{value}</p>;
        precautionaryPhrases.push(st);
      }
    }

    const pictogramsArray = str.pictograms?.map((i) => (
      i !== null ? <SVG key={`ghs${i}`} src={`/images/ghs/${i}.svg`} /> : null));

    return (
      <div>
        <p className="fw-bold">Pictograms: </p>
        {(str.pictograms !== undefined && str.pictograms.length !== 0)
          ? pictogramsArray : <p>Could not find pictograms</p>}
        <p className="fw-bold mt-3">Hazard Statements: </p>
        {HazardPhrases}
        <p className="fw-bold">Precautionary Statements: </p>
        {precautionaryPhrases}
      </div>
    );
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

    ChemicalFetcher.safetyPhrases(queryParams).then((result) => {
      // Clear loading state
      this.setState({ loadingPhrasesVendor: '' });

      const warningMessage = 'Please fetch and save corresponding safety data sheet first';
      if (result === warningMessage || result === 204) {
        this.setState({ warningMessage });
      } else if (result === 'Could not find H and P phrases') {
        this.setState({ warningMessage: result });
      } else {
        this.setState({ safetyPhrases: this.stylePhrases(result) });
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
    let productLink;
    this.setState({ warningMessage: '' });

    if (chemical && vendor === 'thermofischer') {
      productLink = chemical._chemical_data[0].alfaProductInfo
        ? chemical._chemical_data[0].alfaProductInfo.productLink : '';
    } else if (chemical && vendor === 'merck') {
      productLink = chemical._chemical_data[0].merckProductInfo
        ? chemical._chemical_data[0].merckProductInfo.productLink : '';
    }

    // Check if this is a saved SDS or a search result
    const isSavedSds = chemical?._chemical_data?.[0]?.safetySheetPath?.some(
      (sheet) => Object.keys(sheet).some((key) => key.endsWith('_link') && sheet[key])
    );

    if (!productLink) {
      this.setState({ warningMessage: 'Please fetch and save corresponding safety data sheet first' });
      return;
    }

    this.setState({ loadChemicalProperties: { vendor, loading: true } });
    ChemicalFetcher.chemicalProperties(productLink).then((result) => {
      this.setState({ loadChemicalProperties: { vendor: '', loading: false } });
      if (result === 'Could not find additional chemical properties' || result === null) {
        // Only show warning if this is a saved SDS
        if (isSavedSds) {
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
        warningMessage: isSavedSds ? 'Error fetching chemical properties' : ''
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
    const vendorProduct = `${vendorName.trim()}ProductInfo`;
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
    ChemicalFetcher.saveManualAttachedSafetySheet(data)
      .then((updatedChemical) => {
        if (!updatedChemical) {
          console.error('No chemical data returned from the server');
          return;
        }

        const chemicalInstance = new Chemical(updatedChemical);
        this.setState({ chemical: chemicalInstance });
        editChemical(false);
        chemicalInstance.updateChecksum();
      })
      .catch((error) => {
        console.error('Error saving safety sheet:', error);
        this.setState({ loadingSaveSafetySheets: false });
      });
  };

  fetchChemical(sample) {
    if (sample === undefined || sample.is_new) {
      return;
    }
    ChemicalFetcher.fetchChemical(sample.id).then((chemical) => {
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

    handleUpdateSample(sample);
    ElementActions.updateSample(new Sample(sample), false);
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
      // Extract vendor name from the link key (e.g., 'merck' from 'merck_link')
      const vendorName = vendorLinkKey.replace('_link', '');
      const productLinkKey = `${vendorName}_product_link`;
      const productInfoKey = `${vendorName}ProductInfo`;

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

  updateCheckMark(document) {
    // Find any key that ends with "_link"
    const vendorLinkKey = Object.keys(document)
      .find((key) => key.endsWith('_link') && document[key]);
    if (vendorLinkKey) {
      // Extract vendor name by removing "_link" suffix
      const vendor = vendorLinkKey.replace('_link', '');
      this.handleCheckMark(vendor, false);
    }
  }

  checkMarkButton(document) {
    const {
      checkSaveIconThermofischer,
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
      if (vendorName === 'thermofischer' || vendorName === 'alfa') {
        checkSaveIcon = checkSaveIconThermofischer;
      } else if (vendorName === 'merck') {
        checkSaveIcon = checkSaveIconMerck;
      } else {
        // Check our dynamic state for any other vendor
        checkSaveIcon = dynamicCheckMarks[normalizedVendorName] || false;
      }
    }

    // Check if the document has the vendor link and we should show a check mark
    if (document[dynamicKey] && checkSaveIcon) {
      return (
        <OverlayTrigger placement="top" overlay={<Tooltip id={`saveCheckIcon${vendorName}`}>Saved</Tooltip>}>
          <i className="fa fa-check-circle" />
        </OverlayTrigger>
      );
    }

    return null;
  }

  removeButton(index, document) {
    return (
      <Button
        size="xsm"
        variant="danger"
        onClick={() => this.handleRemove(index, document)}
      >
        <i className="fa fa-trash-o" />
      </Button>
    );
  }

  saveSdsFile(productInfo) {
    const { chemical } = this.state;
    const { sample } = this.props;
    let vendorProduct;

    // Determine vendor product key based on vendor name
    if (productInfo.vendor === 'Thermofisher') {
      vendorProduct = 'alfaProductInfo';
    } else if (productInfo.vendor === 'Merck') {
      vendorProduct = 'merckProductInfo';
    } else {
      // Dynamic vendor handling
      vendorProduct = `${productInfo.vendor.toLowerCase()}ProductInfo`;
    }

    // Show loading state for this specific element
    this.setState((prevState) => ({
      loadingSaveSafetySheets: {
        ...prevState.loadingSaveSafetySheets,
        [productInfo.productNumber]: true
      }
    }));

    const cas = sample.xref?.cas ?? '';

    // Update chemical data before saving it in the database
    this.handleFieldChanged(vendorProduct, productInfo);

    const params = {
      sample_id: sample.id,
      cas,
      chemical_data: chemical._chemical_data,
      vendor_product: vendorProduct
    };

    ChemicalFetcher.saveSafetySheets(params).then((result) => {
      if (result) {
        const value = `/safety_sheets/${productInfo.productNumber}_${productInfo.vendor}.pdf`;
        const chemicalData = chemical._chemical_data;

        // Determine the vendor link key
        const vendorParams = `${productInfo.vendor.toLowerCase()}_link`;

        // Create a new entry object for this safety sheet
        const newEntry = {};
        newEntry[vendorParams] = value;

        // Initialize safetySheetPath array if it doesn't exist
        if (!chemicalData[0].safetySheetPath) {
          chemicalData[0].safetySheetPath = [];
        }

        // Check if an entry for this vendor already exists
        const existingIndex = chemicalData[0].safetySheetPath.findIndex(
          (entry) => entry[vendorParams] !== undefined
        );

        if (existingIndex === -1) {
          // If no existing entry, append a new one
          chemicalData[0].safetySheetPath.push(newEntry);
        } else {
          // If an entry exists, update it
          chemicalData[0].safetySheetPath[existingIndex][vendorParams] = value;
        }

        // Mark chemical as not new
        chemical.isNew = false;

        // Update the state and save to database
        this.setState({
          chemical,
          // Clear search results after saving
          searchResults: [],
          // Clear loading state for this element
          loadingSaveSafetySheets: {}
        });
        this.handleSubmitSave();

        // Update the checkmark for this vendor
        this.handleCheckMark(productInfo.vendor);
      }
    }).catch((errorMessage) => {
      console.log(errorMessage);
      // Clear loading state on error
      this.setState(() => ({
        loadingSaveSafetySheets: {}
      }));
    });
  }

  saveSafetySheetsButton(sdsInfo) {
    const {
      checkSaveIconMerck, checkSaveIconThermofischer,
      loadingSaveSafetySheets, chemical, dynamicCheckMarks = {}
    } = this.state;

    // Find any key that ends with "_link" to determine vendor
    const vendorLinkKey = Object.keys(sdsInfo).find((key) => key.endsWith('_link'));
    if (!vendorLinkKey) {
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
      isSaved = safetySheets.some((sheet) => sheet[vendorLinkKey] === sdsLink);
    }

    // 2. If not found in data, check state variables
    if (!isSaved) {
      // Check traditional state variables for backward compatibility
      if (normalizedVendorName === 'thermofischer' || normalizedVendorName === 'alfa') {
        isSaved = checkSaveIconThermofischer;
      } else if (normalizedVendorName === 'merck') {
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

    return (
      <Button
        id="saveSafetySheetButton"
        size="xsm"
        variant="warning"
        disabled={isSaved}
        onClick={() => this.saveSdsFile(productInfo)}
      >
        {isLoading ? (
          <div>
            <i className="fa fa-spinner fa-pulse fa-fw" />
          </div>
        ) : <i className="fa fa-save" />}
      </Button>
    );
  }

  addAttachment() {
    const { chemical } = this.state;
    const savedSds = chemical?._chemical_data?.[0]?.safetySheetPath || [];
    const hasMaxAttachments = savedSds.length >= 10;

    const button = (
      <Button
        size="sm"
        variant="success"
        onClick={() => this.handleAdd()}
        disabled={hasMaxAttachments}
      >
        <i className="fa fa-plus" />
      </Button>
    );

    if (hasMaxAttachments) {
      const message = `Maximum allowed attached safety sheets is reached.
      Please delete some of the existing ones to enable attachment.`;
      return (
        <OverlayTrigger
          placement="top"
          overlay={(
            <Tooltip id="max-attachments-tooltip">
              {message}
            </Tooltip>
          )}
        >
          <div>{button}</div>
        </OverlayTrigger>
      );
    }

    return button;
  }

  chooseVendor() {
    const { vendorValue } = this.state;
    const vendorOptions = [
      // { label: 'All', value: 'All' },
      { label: 'Merck', value: 'Merck' },
      // { label: 'Thermofisher', value: 'Thermofisher' },
    ];

    return (
      <Form.Group data-component="chooseVendor">
        <Form.Label>Vendor</Form.Label>
        <Select
          name="chemicalVendor"
          isClearable={false}
          options={vendorOptions}
          onChange={(selectedOption) => this.handleVendorOption(selectedOption)}
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
      { label: 'CAS', value: 'CAS' }
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
    // First check if document is valid
    if (!document) {
      return null;
    }

    // Find any key that ends with "_link" to determine vendor
    const linkKey = Object.keys(document).find((key) => key.endsWith('_link'));
    const vendorLink = linkKey ? document[linkKey] : null;
    const vendorName = linkKey ? linkKey.replace('_link', '') : 'uploaded source';

    return (
      <div className="d-flex gap-3 align-items-center">
        <div className="d-flex me-auto gap-3">
          {vendorLink ? (
            <a
              href={vendorLink}
              target="_blank"
              rel="noreferrer"
            >
              {`Safety Data Sheet from ${vendorName}`}
              {this.checkMarkButton(document)}
            </a>
          ) : null}
          <ButtonToolbar className="gap-1">
            {this.copyButton(document)}
            {this.saveSafetySheetsButton(document)}
            {this.removeButton(index, document)}
          </ButtonToolbar>
        </div>
        <div className="me-auto">
          {this.renderChemicalProperties(vendorName.toLowerCase())}
        </div>
        <div className="justify-content-end">
          {this.querySafetyPhrases(vendorName.toLowerCase())}
        </div>
      </div>
    );
  };

  renderSafetySheets = () => {
    const {
      searchResults,
      chemical,
      displayWell,
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

    // If no safety sheets at all, show empty message
    if (!hasSearchResults && !hasSavedSds) {
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
      const searchResultsSection = hasSearchResults && (
        <>
          <h6 className="mt-5 text-primary">Search Results:</h6>
          <div className="overflow-auto" style={{ maxHeight: '300px' }}>
            <ol className="list-group list-group-numbered">
              {searchResults.map((document, index) => {
                if (!document) {
                  return null;
                }

                const key = (document.alfa_product_number || document.merck_product_number) || `search-${index}`;
                const isValidDocument = document !== 'Could not find safety data sheet from Thermofisher'
                  && document !== 'Could not find safety data sheet from Merck';

                return (
                  <li className="list-group-item border-0 d-flex align-items-center" key={key}>
                    {isValidDocument ? (
                      <div className="ms-2 me-auto w-100 safety-sheet-width">
                        {this.renderChildElements(document, index)}
                      </div>
                    ) : (
                      <div className="ms-2 me-auto">
                        <p className="mb-0">{document}</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </>
      );

      // Render saved SDS if we have any
      const savedSdsSection = hasSavedSds && (
        <>
          <h6 className="mt-5 text-success">Safety Sheets saved in the database:</h6>
          <div className="overflow-auto" style={{ maxHeight: '300px' }}>
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
        </>
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

  renderSafetyPhrases = () => {
    const { chemical, safetyPhrases } = this.state;
    let fetchedSafetyPhrases;
    if (chemical && chemical._chemical_data !== undefined && chemical._chemical_data.length !== 0) {
      const phrases = chemical._chemical_data[0].safetyPhrases;
      fetchedSafetyPhrases = (phrases !== undefined) ? this.stylePhrases(phrases) : '';
    }
    return (
      <div className="pt-2 w-100">
        {safetyPhrases === '' ? fetchedSafetyPhrases : safetyPhrases}
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
          <Col sm={3}>
            {this.textInput(data, 'Price', 'price')}
          </Col>
        </Row>
        <Row className="mb-3">
          <Col>
            {this.textInput(data, 'Person', 'person')}
          </Col>
          <Col sm={4}>
            <ButtonGroup className="mb-2">
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
            </ButtonGroup>
            {switchRequiredOrderedDate === 'required' && this.textInput(data, 'Date', 'required_date')}
            {switchRequiredOrderedDate === 'ordered' && this.textInput(data, 'Date', 'ordered_date')}
            {switchRequiredOrderedDate === 'expiration' && this.textInput(data, 'Date', 'expiration_date')}
          </Col>
          <Col sm={3}>
            {this.textInput(data, 'Required by', 'required_by')}
          </Col>
        </Row>
        <Row className="mb-3">
          <Col>
            {this.numInputWithoutTable(data, 'Amount', 'amount')}
          </Col>
          <Col className="pt-2">
            {this.numInputWithoutTable(data, '', 'volume')}
          </Col>
          <Col>
            {this.numInputWithoutTable(data, 'Storage Temperature', 'storage_temperature')}
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

            // Also set specific state variables for backward compatibility
            if (normalizedVendorName === 'thermofischer' || normalizedVendorName === 'alfa') {
              this.setState({ checkSaveIconThermofischer: true });
            } else if (normalizedVendorName === 'merck') {
              this.setState({ checkSaveIconMerck: true });
            }
          });
        }
      });

      // Update the dynamicCheckMarks state
      this.setState({ dynamicCheckMarks });
    }
  }

  querySafetySheetButton() {
    const { loadingQuerySafetySheets, chemical } = this.state;

    // Check if there are any saved safety sheets
    const savedSds = chemical?._chemical_data?.[0]?.safetySheetPath || [];
    const hasSavedSds = savedSds.length > 0;

    // Check if default vendors (merck or thermofischer) exist in saved safety sheets
    const hasDefaultVendors = savedSds.some((sheet) => {
      const keys = Object.keys(sheet);
      return keys.includes('merck_link') || keys.includes('thermofischer_link') || keys.includes('alfa_link');
    });

    // Only disable the button if we're loading or if default vendors exist
    const isDisabled = !!loadingQuerySafetySheets || hasDefaultVendors;

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
      <Tooltip id="disabledSdsSearchButton">
        {hasDefaultVendors
          ? 'Search is disabled because default vendor safety sheets already exist. Delete them to enable search.'
          : 'Delete saved sheets to enable search button'}
      </Tooltip>
    );

    return (
      <div className="mt-4">
        {isDisabled && hasSavedSds ? (
          <OverlayTrigger placement="top" overlay={overlay}>
            <div>{button}</div>
          </OverlayTrigger>
        ) : button}
      </div>
    );
  }

  safetyTab() {
    const { displayWell, warningMessage } = this.state;
    return (
      <>
        <Row className="mb-3 align-items-end">
          <Col xs="auto" className="mb-1">
            {this.addAttachment()}
          </Col>
          <Col>
            {this.chooseVendor()}
          </Col>
          <Col>
            {this.queryOption()}
          </Col>
          <Col>
            {this.safetySheetLanguage()}
          </Col>
          <Col>
            {this.querySafetySheetButton()}
          </Col>
        </Row>

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
      <Modal
        centered
        show={viewChemicalPropertiesModal}
        onHide={() => this.closePropertiesModal()}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Fetched Chemical Properties</Modal.Title>
        </Modal.Header>
        <Modal.Body>
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
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="warning" onClick={() => this.closePropertiesModal()}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  render() {
    const {
      chemical,
      showModal,
    } = this.state;

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

          <Accordion.Item eventKey="safetyTab">
            <Accordion.Header>Safety</Accordion.Header>
            <Accordion.Body>
              {this.safetyTab()}
            </Accordion.Body>
          </Accordion.Item>

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
          onSubmit={this.handleAttachmentSubmit}
        />
      </>
    );
  }
}

ChemicalTab.propTypes = {
  sample: PropTypes.object,
  handleUpdateSample: PropTypes.func.isRequired,
  saveInventory: PropTypes.bool.isRequired,
  setSaveInventory: PropTypes.func.isRequired,
  editChemical: PropTypes.func.isRequired,
};
