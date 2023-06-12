/* eslint-disable no-underscore-dangle */
import React from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, ControlLabel, FormControl, Button, OverlayTrigger, Tooltip, Tabs, Tab, ButtonToolbar,
  ListGroup, ListGroupItem, InputGroup, Collapse, Modal
} from 'react-bootstrap';
import Spinner from 'react-svg-spinner';
import Select from 'react-select';
import SVG from 'react-inlinesvg';
import ChemicalFetcher from 'src/fetchers/ChemicalFetcher';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import Sample from 'src/models/Sample';
import CollapseButton from 'src/components/common/CollapseButton';
import NumericInputUnit from 'src/apps/mydb/elements/details/NumericInputUnit';

export default class ChemicalTab extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      chemical: undefined,
      safetySheets: [],
      displayWell: false,
      checkSaveIconThermofischer: false,
      checkSaveIconMerck: false,
      vendorValue: 'All',
      queryOption: 'CAS',
      safetySheetLanguage: 'en',
      safetyPhrases: '',
      warningMessage: '',
      loadingQuerySafetySheets: false,
      loadingSaveSafetySheets: false,
      loadChemicalProperties: { vendor: '', loading: false },
      openInventoryInformationTab: true,
      openSafetyTab: true,
      openLocationTab: true,
      viewChemicalPropertiesModal: false,
      viewModalForVendor: ''
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
    const { saveInventory, parent } = this.props;
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
    if (chemical) {
      chemical.buildChemical(parameter, value);
    }
    this.setState({ chemical });
  }

  handleSubmitSave() {
    const { chemical } = this.state;
    const { sample, parent } = this.props;
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
          chemical.changed = false;
          this.setState({ chemical });
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
      chemical.isNew = false;
    } else {
      ChemicalFetcher.update(params).then((response) => {
        if (response) {
          chemical.changed = false;
          this.setState({ chemical });
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    }
    parent.setState({ saveInventoryAction: false });
  }

  handleRemove(index, document) {
    const { safetySheets, chemical } = this.state;
    const parameters = chemical._chemical_data[0];
    if (safetySheets.length !== 0) {
      safetySheets.splice(index, 1);
      this.setState({ safetySheets });
    }
    if (chemical._chemical_data[0].safetySheetPath.length > 0) {
      const { safetySheetPath } = chemical._chemical_data[0];

      const alfaIndex = safetySheetPath.findIndex((element) => element.alfa_link);
      const merckIndex = safetySheetPath.findIndex((element) => element.merck_link);
      if (alfaIndex !== -1 && document.alfa_link) {
        delete parameters.alfaProductInfo;
        chemical._chemical_data[0].safetySheetPath.splice(alfaIndex, 1);
      } else if (merckIndex !== -1 && document.merck_link) {
        delete parameters.merckProductInfo;
        chemical._chemical_data[0].safetySheetPath.splice(merckIndex, 1);
      }
      this.setState({ chemical });
      this.handleSubmitSave();
    }
    this.setState({ warningMessage: '' });
    this.updateCheckMark(document);
  }

  handleCheckMark(vendor) {
    if (vendor === 'Thermofisher') {
      this.setState({ checkSaveIconThermofischer: true });
    } else if (vendor === 'Merck') {
      this.setState({ checkSaveIconMerck: true });
    }
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
      vendor: vendorValue,
      queryOption,
      language: safetySheetLanguage,
      string: searchStr
    };
    const { safetySheets } = this.state;

    ChemicalFetcher.fetchSafetySheets(queryParams).then((result) => {
      const obj = JSON.parse(result);
      safetySheets.splice(0, 1);
      this.setState({ safetySheets });
      this.setState({ safetySheets: Object.values(obj) });
      this.setState({ loadingQuerySafetySheets: false });
      this.setState({ displayWell: true });
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  };

  // eslint-disable-next-line class-methods-use-this
  stylePhrases = (str) => {
    const HazardPhrases = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of Object.entries(str.h_statements)) {
      // eslint-disable-next-line react/jsx-one-expression-per-line
      const st = <p> {key}:{value} </p>;
      HazardPhrases.push(st);
    }

    const precautionaryPhrases = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of Object.entries(str.p_statements)) {
      // eslint-disable-next-line react/jsx-one-expression-per-line
      const st = <p>{key}:{value}</p>;
      precautionaryPhrases.push(st);
    }

    const pictogramsArray = str.pictograms.map((i) => (i !== null ? <SVG key={`ghs${i}`} src={`/images/ghs/${i}.svg`} /> : null));

    return (
      <div>
        <p className="safety-phrases">Pictograms: </p>
        {(str.pictograms !== undefined || str.pictograms.length !== 0)
          ? pictogramsArray : <p>Could not find pictograms</p>}
        <p className="safety-phrases">Hazard Statements: </p>
        {HazardPhrases}
        <p className="safety-phrases">Precautionary Statements: </p>
        {precautionaryPhrases}
      </div>
    );
  };

  fetchSafetyPhrases = (vendor) => {
    const { sample } = this.props;
    const queryParams = {
      vendor, id: sample.id
    };
    const warningMessage = 'Please fetch and save corresponding safety data sheet first';
    this.setState({ warningMessage: '' });
    ChemicalFetcher.safetyPhrases(queryParams).then((result) => {
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
    });
  };

  fetchChemicalProperties = (vendor) => {
    const { chemical } = this.state;
    let productLink;
    this.setState({ loadChemicalProperties: { vendor, loading: true } });
    this.setState({ warningMessage: '' });

    if (chemical && vendor === 'thermofischer') {
      productLink = chemical._chemical_data[0].alfaProductInfo ? chemical._chemical_data[0].alfaProductInfo.productLink : '';
    } else if (chemical && vendor === 'merck') {
      productLink = chemical._chemical_data[0].merckProductInfo ? chemical._chemical_data[0].merckProductInfo.productLink : '';
    }
    const warningMessage = 'Please fetch and save corresponding safety data sheet first';

    ChemicalFetcher.chemicalProperties(productLink).then((result) => {
      this.setState({ loadChemicalProperties: { vendor: '', loading: false } });
      if (result === 'Could not find additional chemical properties' || result === null) {
        this.setState({ warningMessage });
      } else {
        if (chemical && vendor === 'thermofischer') {
          chemical._chemical_data[0].alfaProductInfo.properties = result;
        } else if (chemical && vendor === 'merck') {
          chemical._chemical_data[0].merckProductInfo.properties = result;
        }
        this.mapToSampleProperties(vendor);
      }
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  };

  querySafetyPhrases = (vendor) => (
    <div>
      <Button
        id="safetyPhrases-btn"
        onClick={() => this.fetchSafetyPhrases(vendor)}
      >
        fetch Safety Phrases
      </Button>
    </div>
  );

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
    const { sample, parent } = this.props;
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
        const lowerBound = rangeValues[0];
        const upperBound = rangeValues.length === 2 ? rangeValues[1] : Number.POSITIVE_INFINITY;
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

    parent.setState({ sample });
    ElementActions.updateSample(new Sample(sample), false);
  }

  chemicalStatus(data, label, parameter) {
    const val = data?.[parameter] ?? '';
    const statusOptions = [
      { label: 'Available', value: 'Available' },
      { label: 'Out of stock', value: 'Out of stock' },
      { label: 'To be ordered', value: 'To be ordered' },
      { label: 'Ordered', value: 'Ordered' }
    ];
    return (
      <FormGroup>
        <ControlLabel>{label}</ControlLabel>
        <InputGroup id="chemical-status">
          <Select.Creatable
            name="chemicalStatus"
            multi={false}
            options={statusOptions}
            onChange={(e) => { this.handleFieldChanged(parameter, e.value); }}
            value={val}
            clearable={false}
          />
        </InputGroup>
      </FormGroup>
    );
  }

  textInput(data, label, parameter) {
    const componentClass = parameter !== 'important_notes' && parameter !== 'disposal_info' && parameter !== 'sensitivity_storage'
    && parameter !== 'solubility' ? 'input' : 'textarea';
    let value = '';
    if (parameter !== 'cas') {
      value = data?.[parameter] ?? '';
    } else {
      value = data || '';
    }
    let conditionalOverlay;
    if (parameter === 'date') {
      conditionalOverlay = 'please enter the name of the person who orders/ordered the substance';
    } else if (parameter === 'required_by') {
      conditionalOverlay = 'please enter the name of the person who requires the substance';
    } else {
      conditionalOverlay = null;
    }
    const checkLabel = label !== 'Date' && <ControlLabel>{label}</ControlLabel>;

    return (
      <OverlayTrigger placement="top" overlay={parameter === 'date' || parameter === 'required_by' ? <Tooltip id="field-text-input">{conditionalOverlay}</Tooltip> : <div />}>
        <FormGroup>
          {checkLabel}
          <FormControl
            componentClass={componentClass}
            id={`textInput_${label}`}
            type="text"
            value={value}
            onChange={(e) => { this.handleFieldChanged(parameter, e.target.value); }}
            rows={label !== 'Important notes' && label !== 'Disposal information' ? 1 : 2}
          />
        </FormGroup>
      </OverlayTrigger>
    );
  }

  // eslint-disable-next-line class-methods-use-this
  clipboardTooltip(value) {
    const info = `copy product link (${value})`;
    return (
      <Tooltip id="productLink_button">{info}</Tooltip>
    );
  }

  copyButton(document) {
    const { chemical } = this.state;
    let info = '';
    let value;
    if (chemical) {
      if (chemical._chemical_data !== undefined && chemical._chemical_data.length !== 0) {
        info = chemical._chemical_data[0];
      }
    }
    if (document.alfa_link !== undefined) {
      if (info.alfaProductInfo) {
        value = info.alfaProductInfo.productLink;
      } else {
        value = document.alfa_product_link || null;
      }
    } else if (info.merckProductInfo) {
      value = info.merckProductInfo.productLink;
    } else {
      value = document.merck_product_link || null;
    }
    return (
      <OverlayTrigger placement="bottom" overlay={this.clipboardTooltip(value)}>
        <Button active className="clipboardBtn" data-clipboard-text={value} bsSize="xs">
          <i className="fa fa-clipboard" />
        </Button>
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
      ? <ControlLabel>{modifyStr}</ControlLabel> : <ControlLabel className="location-input"> </ControlLabel>;
    const paramsObj = {};
    paramsObj[domain] = parameter;

    return (
      <div>
        {ParentLabel}
        <InputGroup className="location-chemicalTab">
          <InputGroup.Addon>{subLabel}</InputGroup.Addon>
          <FormGroup controlId="subLabel">
            <FormControl
              componentClass="input"
              value={value}
              onChange={(e) => { this.handleFieldChanged(parameter, e.target.value); }}
            />
          </FormGroup>
        </InputGroup>
      </div>
    );
  }

  numInputWithoutTable(data, label, parameter) {
    const value = data?.[parameter]?.value ?? 0;
    const unit = data?.[parameter]?.unit ?? 'mg';
    return (
      <NumericInputUnit
        field="inventory_amount"
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
    if (document.alfa_link) {
      this.setState({ checkSaveIconThermofischer: false });
    } else if (document.merck_link) {
      this.setState({ checkSaveIconMerck: false });
    }
  }

  checkMarkButton(document) {
    const { checkSaveIconThermofischer, checkSaveIconMerck } = this.state;
    let checkMark;
    if (document.alfa_link) {
      checkMark = (!checkSaveIconThermofischer && document.alfa_product_number !== undefined)
        ? null : (
          <OverlayTrigger placement="top" overlay={<Tooltip id="saveCheckIconThermo">Saved</Tooltip>}>
            <i className="fa fa-check-circle" />
          </OverlayTrigger>
        );
    } else if (document.merck_link) {
      checkMark = (!checkSaveIconMerck && document.merck_product_number !== undefined) ? null : (
        <OverlayTrigger placement="top" overlay={<Tooltip id="saveCheckIconMerck">Saved</Tooltip>}>
          <i className="fa fa-check-circle" />
        </OverlayTrigger>
      );
    }
    return checkMark;
  }

  removeButton(index, document) {
    return (
      <Button
        bsSize="xs"
        bsStyle="danger"
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
    if (productInfo.vendor === 'Thermofisher') {
      vendorProduct = 'alfaProductInfo';
    } else if (productInfo.vendor === 'Merck') {
      vendorProduct = 'merckProductInfo';
      this.setState({ loadingSaveSafetySheets: true });
    }
    const cas = sample.xref?.cas ?? '';
    // update chemical data before saving it in the database
    this.handleFieldChanged(vendorProduct, productInfo);
    const params = {
      sample_id: sample.id,
      cas,
      chemical_data: chemical._chemical_data,
      vendor_product: vendorProduct
    };
    ChemicalFetcher.saveSafetySheets(params).then((result) => {
      if (result || result === 'file is already saved') {
        const value = `/safety_sheets/${productInfo.productNumber}_${productInfo.vendor}.pdf`;
        const chemicalData = chemical._chemical_data;
        const pathArr = [];
        const pathParams = {};
        let vendorParams;
        if (productInfo.vendor === 'Thermofisher') {
          vendorParams = 'alfa_link';
        } else {
          vendorParams = 'merck_link';
        }
        pathParams[vendorParams] = value;
        if (chemicalData[0].safetySheetPath === undefined
          || chemicalData[0].safetySheetPath.length === 0) {
          pathArr.push(pathParams);
          this.handleFieldChanged('safetySheetPath', pathArr);
        } else if (chemicalData[0].safetySheetPath.length === 1
          && chemicalData[0].safetySheetPath[0][vendorParams]
          === undefined) {
          chemicalData[0].safetySheetPath.push(pathParams);
        } else if (chemicalData[0].safetySheetPath.length === 1
          && chemicalData[0].safetySheetPath[0][vendorParams]
          !== undefined && chemicalData[0].safetySheetPath[0][vendorParams] !== value) {
          chemicalData[0].safetySheetPath[0][vendorParams] = value;
        } else {
          for (let i = 0; i < chemicalData[0].safetySheetPath.length; i += 1) {
            if (chemicalData[0].safetySheetPath[i][vendorParams]
              !== undefined && chemicalData[0].safetySheetPath[i][vendorParams] !== value) {
              chemicalData[0].safetySheetPath[i][vendorParams] = value;
            }
          }
        }
        chemical.isNew = false;
        this.setState({ chemical });
        this.handleSubmitSave();
        this.setState({ loadingSaveSafetySheets: false });
        this.handleCheckMark(productInfo.vendor);
      }
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  saveSafetySheetsButton(sdsInfo, index) {
    const {
      checkSaveIconMerck, checkSaveIconThermofischer,
      loadingSaveSafetySheets, chemical
    } = this.state;
    let vendor;
    let sdsLink;
    let productNumber;
    let productLink;
    let checkMark;
    if (chemical && chemical._chemical_data) {
      const { safetySheetPath } = chemical._chemical_data[0] || [];
      if (sdsInfo.alfa_link !== undefined) {
        vendor = 'Thermofisher';
        sdsLink = sdsInfo.alfa_link;
        productNumber = sdsInfo.alfa_product_number;
        productLink = sdsInfo.alfa_product_link;
        const hasAlfaLink = Boolean(safetySheetPath?.[index]?.alfa_link);
        checkMark = checkSaveIconThermofischer || hasAlfaLink;
      } else if (sdsInfo.merck_link !== undefined) {
        vendor = 'Merck';
        sdsLink = sdsInfo.merck_link;
        productNumber = sdsInfo.merck_product_number;
        productLink = sdsInfo.merck_product_link;
        const hasMerckLink = Boolean(safetySheetPath?.[index]?.merck_link);
        checkMark = checkSaveIconMerck || hasMerckLink;
      }
    }
    const productInfo = {
      vendor,
      sdsLink,
      productNumber,
      productLink,
    };

    return (
      <Button
        id="saveSafetySheetButton"
        bsSize="xs"
        bsStyle="warning"
        disabled={checkMark}
        onClick={() => this.saveSdsFile(productInfo)}
      >
        {loadingSaveSafetySheets === true && sdsInfo.merck_link !== undefined
          ? (
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          )
          : <i className="fa fa-save" />}
      </Button>
    );
  }

  chooseVendor() {
    const { vendorValue } = this.state;
    const vendorOptions = [
      { label: 'All', value: 'All' },
      { label: 'Merck', value: 'Merck' },
      { label: 'Thermofisher', value: 'Thermofisher' },
    ];

    return (
      <FormGroup>
        <ControlLabel>Vendor</ControlLabel>
        <Select
          name="chemicalVendor"
          clearable={false}
          options={vendorOptions}
          onChange={(e) => this.handleVendorOption(e.value)}
          value={vendorValue}
        />
      </FormGroup>
    );
  }

  queryOption() {
    const { queryOption } = this.state;
    const queryOptions = [
      { label: 'Common Name', value: 'Common Name' },
      { label: 'CAS', value: 'CAS' }
    ];

    return (
      <OverlayTrigger placement="top" overlay={<Tooltip id="sds-query-message">Assign a cas number using the cas field in labels section for better search results using cas number</Tooltip>}>
        <FormGroup>
          <ControlLabel>Query SDS using</ControlLabel>
          <Select
            name="queryOption"
            clearable={false}
            options={queryOptions}
            onChange={(e) => this.handleQueryOption(e.value)}
            value={queryOption}
          />
        </FormGroup>
      </OverlayTrigger>

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
      <FormGroup>
        <ControlLabel>Choose Language of SDS</ControlLabel>
        <Select
          name="languageOption"
          clearable={false}
          options={languageOptions}
          onChange={(e) => this.handleLanguageOption(e.value)}
          value={safetySheetLanguage}
        />
      </FormGroup>
    );
  }

  renderChildElements = (document, index) => (
    <div className="render-childs">
      <div className="child-elements">
        <div className="link-wrapper">
          <a href={(document.alfa_link !== undefined) ? document.alfa_link : document.merck_link} target="_blank" rel="noreferrer">
            {(document.alfa_link !== undefined) ? 'Safety Data Sheet from Thermofisher' : 'Safety Data Sheet from Merck'}
            { this.checkMarkButton(document) }
          </a>
        </div>
        <div className="button-toolbar-wrapper">
          <ButtonToolbar>
            {this.copyButton(document)}
            {this.saveSafetySheetsButton(document, index)}
            {this.removeButton(index, document)}
          </ButtonToolbar>
        </div>
        <div className="chemical-properties">
          { document.alfa_link !== undefined ? this.renderChemicalProperties('thermofischer') : this.renderChemicalProperties('merck') }
        </div>
        <div className="safety-phrases">
          { document.alfa_link !== undefined ? this.querySafetyPhrases('thermofischer') : this.querySafetyPhrases('merck') }
        </div>
      </div>
    </div>
  );

  renderSafetySheets = () => {
    const { safetySheets, chemical } = this.state;
    if (!chemical || !chemical._chemical_data || !chemical._chemical_data.length) {
      return null;
    }
    const savedSds = chemical._chemical_data[0].safetySheetPath;
    const sdsStatus = safetySheets.length ? safetySheets : savedSds;
    const mappedSafetySheets = sdsStatus.map((document, index) => {
      const key = (document.alfa_product_number || document.merck_product_number) || index;
      return (
        <div className="safety-sheets-form" key={key}>
          {document !== 'Could not find safety data sheet from Thermofisher' && document !== 'Could not find safety data sheet from Merck' ? (
            <ListGroupItem key={`${key}-file`}>
              {this.renderChildElements(document, index)}
            </ListGroupItem>
          ) : (
            <ListGroupItem key={`${key}-no-document`}>
              <div>
                <p className="safety-sheets-paragraph">
                  {document}
                </p>
              </div>
            </ListGroupItem>
          )}
        </div>
      );
    });

    return <ListGroup>{mappedSafetySheets}</ListGroup>;
  };

  renderSafetyPhrases = () => {
    const { chemical, safetyPhrases } = this.state;
    let fetchedSafetyPhrases;
    if (chemical && chemical._chemical_data !== undefined && chemical._chemical_data.length !== 0) {
      const phrases = chemical._chemical_data[0].safetyPhrases;
      fetchedSafetyPhrases = (phrases !== undefined) ? this.stylePhrases(phrases) : '';
    }
    return (
      <div className="render-safety-phrases">
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

    return (
      <div className="render-chemical-properties">
        <InputGroup.Button>
          <OverlayTrigger placement="top" overlay={<Tooltip id="renderChemProp">Info, if any found, will be copied to properties fields in sample properties tab</Tooltip>}>
            <Button
              id="fetch-properties"
              onClick={() => this.fetchChemicalProperties(vendor)}
              disabled={!!loadingQuerySafetySheets || !!loadChemicalProperties.loading}
              className="fetch-properties-button"
            >
              {loadChemicalProperties.loading === true && loadChemicalProperties.vendor === vendor
                ? (
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                ) : 'fetch Chemical Properties'}
            </Button>
          </OverlayTrigger>
        </InputGroup.Button>
        <InputGroup.Button>
          <OverlayTrigger placement="top" overlay={<Tooltip id="viewChemProp">click to view fetched chemical properties</Tooltip>}>
            <Button active className="show-properties-modal" onClick={() => this.handlePropertiesModal(vendor)}><i className="fa fa-file-text" /></Button>
          </OverlayTrigger>
        </InputGroup.Button>

      </div>
    );
  };

  inventoryCollapseBtn() {
    const { openInventoryInformationTab } = this.state;
    return (
      <CollapseButton
        openTab={openInventoryInformationTab}
        setOpenTab={() => this.setState(
          { openInventoryInformationTab: !openInventoryInformationTab }
        )}
        name="Inventory Information"
      />
    );
  }

  safetyCollapseBtn() {
    const { openSafetyTab } = this.state;
    return (
      <CollapseButton
        openTab={openSafetyTab}
        setOpenTab={() => this.setState({ openSafetyTab: !openSafetyTab })}
        name="Safety"
      />
    );
  }

  locationCollapseBtn() {
    const { openLocationTab } = this.state;
    return (
      <CollapseButton
        openTab={openLocationTab}
        setOpenTab={() => this.setState({ openLocationTab: !openLocationTab })}
        name="Location and Information"
      />
    );
  }

  inventoryInformationTab(data) {
    const { openInventoryInformationTab } = this.state;
    return (
      <div className="inventory-tab">
        {this.inventoryCollapseBtn()}
        <Collapse in={openInventoryInformationTab} key="inventory-Information-collapse-list">
          <div className="inventory-tab">
            <div className="inventory-information">
              <div className="inventory-information-status">
                {this.chemicalStatus(data, 'Status', 'status')}
              </div>
              <div className="inventory-text-input">
                {this.textInput(data, 'Vendor', 'vendor')}
              </div>
              <div className="inventory-text-input">
                {this.textInput(data, 'Order number', 'order_number')}
              </div>
              <div className="inventory-text-input">
                {this.numInputWithoutTable(data, 'Amount', 'amount')}
              </div>
              <div className="inventory-text-input">
                {this.textInput(data, 'Price', 'price')}
              </div>
            </div>
            <div className="text-input-group">
              <div className="text-input-person">
                {this.textInput(data, 'Person', 'person')}
              </div>
              <div className="text-input-date">
                <Tabs id="tab-date">
                  <Tab eventKey="required" title="Required date">
                    {this.textInput(data, 'Date', 'required_date')}
                  </Tab>
                  <Tab eventKey="ordered" title="Ordered date">
                    {this.textInput(data, 'Date', 'ordered_date')}
                  </Tab>
                </Tabs>
              </div>
              <div className="text-input-required-by">
                {this.textInput(data, 'Required by', 'required_by')}
              </div>
            </div>
          </div>
        </Collapse>
      </div>
    );
  }

  locationTab(data) {
    const { openLocationTab } = this.state;
    return (
      <div>
        {this.locationCollapseBtn()}
        <Collapse in={openLocationTab} key="location-tab-collapse-list">
          <div className="location-tab">
            <div className="location-input-group">
              <div>
                {this.locationInput(data, 'host_building', 'host_location')}
              </div>
              <div>
                {this.locationInput(data, 'host_room', 'host_location')}
              </div>
              <div>
                {this.locationInput(data, 'host_cabinet', 'host_location')}
              </div>
              <div>
                {this.locationInput(data, 'host_group', 'host_group')}
              </div>
              <div>
                {this.locationInput(data, 'host_owner', 'host_group')}
              </div>
            </div>
            <div className="location-input-group">
              <div>
                {this.locationInput(data, 'current_building', 'current_location')}
              </div>
              <div>
                {this.locationInput(data, 'current_room', 'current_location')}
              </div>
              <div>
                {this.locationInput(data, 'current_cabinet', 'current_location')}
              </div>
              <div>
                {this.locationInput(data, 'current_group', 'current_group')}
              </div>
              <div>
                {this.locationInput(data, 'borrowed_by', 'current_group')}
              </div>
            </div>
            <div className="disposal-info">
              <div>
                {this.textInput(data, 'Disposal information', 'disposal_info')}
              </div>
            </div>
            <div className="important-notes">
              <div>
                {this.textInput(data, 'Important notes', 'important_notes')}
              </div>
            </div>
          </div>
        </Collapse>
      </div>

    );
  }

  updateDisplayWell() {
    const { chemical } = this.state;
    let savedSds;
    if (chemical) {
      if (chemical._chemical_data !== undefined && chemical._chemical_data.length !== 0) {
        savedSds = chemical._chemical_data[0].safetySheetPath;
        if (savedSds && savedSds.length !== 0) {
          this.setState({ displayWell: true });
        }
      }
    }
  }

  querySafetySheetButton() {
    const { loadingQuerySafetySheets, chemical } = this.state;
    let checkSavedSds = false;
    checkSavedSds = chemical?._chemical_data?.[0]?.safetySheetPath?.length !== undefined
    && chemical._chemical_data[0].safetySheetPath.length !== 0;

    const button = (
      <Button
        id="submit-sds-btn"
        onClick={() => this.querySafetySheets()}
        disabled={!!loadingQuerySafetySheets || checkSavedSds}
      >
        {loadingQuerySafetySheets === false ? 'Search for SDS'
          : (
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          )}
      </Button>
    );

    const overlay = (
      <Tooltip id="disabledSdsSearchButton">delete saved sheets to enable search button</Tooltip>
    );

    const buttonElement = (
      <div className="button-container">
        {button}
        {checkSavedSds && (
          <OverlayTrigger placement="top" overlay={overlay}>
            <div className="overlay-trigger-container" />
          </OverlayTrigger>
        )}
      </div>
    );
    return buttonElement;
  }

  safetyTab() {
    const { openSafetyTab, displayWell } = this.state;
    return (
      <div>
        {this.safetyCollapseBtn()}
        <Collapse in={openSafetyTab} key="inventory-safety-tab-collapse-list">
          <div className="safety-tab">
            <div className="parent-element-safety">
              <div className="choose-vendor">
                {this.chooseVendor()}
              </div>
              <div className="query-option">
                {this.queryOption()}
              </div>
              <div className="safety-sheet-language">
                {this.safetySheetLanguage()}
              </div>
              <div className="query-safety-sheet-button">
                {this.querySafetySheetButton()}
              </div>
            </div>
            <div>
              { displayWell && (
                <div>
                  {this.renderSafetySheets()}
                </div>
              ) }
            </div>
            { this.renderWarningMessage() }
            { this.renderSafetyPhrases() }
          </div>
        </Collapse>
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
        ? JSON.stringify(chemical._chemical_data[0].alfaProductInfo.properties, null, '\n') : fetchedChemicalProperties;
    } else if (viewModalForVendor === 'merck') {
      const condition = chemical._chemical_data[0].merckProductInfo
      && chemical._chemical_data[0].merckProductInfo.properties;
      fetchedChemicalProperties = condition
        ? JSON.stringify(chemical._chemical_data[0].merckProductInfo.properties, null, '\n') : fetchedChemicalProperties;
    }
    if (viewChemicalPropertiesModal) {
      return (
        <Modal
          show={viewChemicalPropertiesModal}
          onHide={() => this.closePropertiesModal()}
        >
          <Modal.Header closeButton>
            <Modal.Title>Fetched Chemical Properties</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="properties-modal-dev">
              <FormGroup controlId="propertiesModal">
                <FormControl
                  componentClass="textarea"
                  className="properties-modal"
                  readOnly
                  disabled
                  type="text"
                  value={fetchedChemicalProperties}
                />
              </FormGroup>
            </div>
            <div>
              <Button bsStyle="warning" onClick={() => this.closePropertiesModal()}>
                Close
              </Button>
            </div>
          </Modal.Body>
        </Modal>
      );
    }
    return (<div />);
  }

  renderWarningMessage() {
    const { warningMessage } = this.state;
    return (
      <div className="text-danger">
        { warningMessage !== '' ? warningMessage : null }
      </div>
    );
  }

  render() {
    const {
      chemical
    } = this.state;

    const data = chemical?._chemical_data?.[0] ?? [];
    return (
      <table className="table table-borderless">
        <tbody>
          <tr>
            <td className="chemical-table-cells">
              {this.inventoryInformationTab(data)}
            </td>
          </tr>
          <tr>
            <td className="chemical-table-cells">
              {this.safetyTab()}
            </td>
          </tr>
          <tr>
            <td className="chemical-table-cells">
              {this.locationTab(data)}
            </td>
          </tr>
          <tr>
            <td className="chemical-table-cells">
              <div>
                {this.renderPropertiesModal()}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    );
  }
}

ChemicalTab.propTypes = {
  sample: PropTypes.object,
  saveInventory: PropTypes.bool.isRequired
};
