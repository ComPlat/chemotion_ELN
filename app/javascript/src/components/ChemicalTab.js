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
      switchRequiredOrderedDate: 'required',
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
    const { safetySheets, chemical } = this.state;
    const parameters = chemical._chemical_data[0];
    if (safetySheets.length !== 0) {
      safetySheets.splice(index, 1);
      this.setState({ safetySheets });
    }
    const path = chemical._chemical_data[0].safetySheetPath;
    if (path && path.length > 0) {
      const { safetySheetPath } = chemical._chemical_data[0];

      const alfaIndex = safetySheetPath.findIndex((element) => element.alfa_link);
      const merckIndex = safetySheetPath.findIndex((element) => element.merck_link);
      if (alfaIndex !== -1 && document.alfa_link) {
        delete parameters.alfaProductInfo;
        path.splice(alfaIndex, 1);
      } else if (merckIndex !== -1 && document.merck_link) {
        delete parameters.merckProductInfo;
        path.splice(merckIndex, 1);
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
      if (obj !== null && obj !== undefined) {
        this.setState({ safetySheets: Object.values(obj) });
      } else {
        // using a mock value if obj undefined or null -> for testing purposes
        const mockValue = ['mockValue'];
        this.setState({ safetySheets: mockValue });
      }
      this.setState({ loadingQuerySafetySheets: false });
      this.setState({ displayWell: true });
    }).catch((errorMessage) => {
      console.log(errorMessage);
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
          if (chemical._chemical_data && chemical._chemical_data[0] && chemical._chemical_data[0].merckProductInfo) {
            chemical._chemical_data[0].merckProductInfo.properties = result;
          }
        }
        this.mapToSampleProperties(vendor);
      }
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  };

  querySafetyPhrases = (vendor) => (
    <Button
      id="safetyPhrases-btn"
      onClick={() => this.fetchSafetyPhrases(vendor)}
      variant="light"
    >
      fetch Safety Phrases
    </Button>
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

  // eslint-disable-next-line class-methods-use-this
  clipboardTooltip(value) {
    const info = `product link (${value})`;
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
        <Button active size="xsm" variant="light">
          <a href={value} target="_blank" rel="noreferrer">
            <i className="fa fa-external-link" />
          </a>
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
      if (result) {
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
        size="xsm"
        variant="warning"
        disabled={checkMark}
        onClick={() => this.saveSdsFile(productInfo)}
      >
        {loadingSaveSafetySheets === true && sdsInfo.merck_link !== undefined
          ? (
            <div>
              <i className="fa fa-spinner fa-pulse fa-fw" />
            </div>
          )
          : <i className="fa fa-save" />}
      </Button>
    );
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
    const conditionalOverlay = 'Assign a cas number using the cas field in labels section for better search results using cas number';

    return (
      <Form.Group>
        <Form.Label>
          Query SDS using
          <OverlayTrigger
            placement="top"
            overlay={cas && cas !== '' ? null : <Tooltip>{conditionalOverlay}</Tooltip>}
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

  renderChildElements = (document, index) => (
    <div className="d-flex gap-3 align-items-center">
      <div className=" d-flex me-auto gap-3">
        <a href={(document.alfa_link !== undefined) ? document.alfa_link : document.merck_link} target="_blank" rel="noreferrer">
          {(document.alfa_link !== undefined) ? 'Safety Data Sheet from Thermofisher' : 'Safety Data Sheet from Merck'}
          {this.checkMarkButton(document)}
        </a>
        <ButtonToolbar className="gap-1">
          {this.copyButton(document)}
          {this.saveSafetySheetsButton(document, index)}
          {this.removeButton(index, document)}
        </ButtonToolbar>
      </div>
      <div className="me-auto">
        {document.alfa_link !== undefined
          ? this.renderChemicalProperties('thermofischer') : this.renderChemicalProperties('merck')}
      </div>
      <div className="justify-content-end">
        {document.alfa_link !== undefined ? this.querySafetyPhrases('thermofischer') : this.querySafetyPhrases('merck')}
      </div>
    </div>
  );

  renderSafetySheets = () => {
    const { safetySheets, chemical } = this.state;
    if (!chemical || !chemical._chemical_data || !chemical._chemical_data.length) {
      return null;
    }
    const savedSds = chemical._chemical_data[0]?.safetySheetPath;
    const sdsStatus = safetySheets.length ? safetySheets : savedSds;
    if (!Array.isArray(sdsStatus)) {
      console.error('sdsStatus is not an array', sdsStatus);
      return null;
    }
    const mappedSafetySheets = sdsStatus?.map((document, index) => {
      const key = (document.alfa_product_number || document.merck_product_number) || index;
      const isValidDocument = document !== 'Could not find safety data sheet from Thermofisher'
        && document !== 'Could not find safety data sheet from Merck';
      return (
        <div className="mt-3 w-100" key={key}>
          {isValidDocument ? (
            <ListGroupItem key={`${key}-file`} className="p-3">
              {this.renderChildElements(document, index)}
            </ListGroupItem>
          ) : (
            <ListGroupItem key={`${key}-no-document`}>
              <div>
                <p className="pt-2">
                  {document}
                </p>
              </div>
            </ListGroupItem>
          )}
        </div>
      );
    });

    return (
      <div data-component="SafetySheets">
        <ListGroup className="my-3">{mappedSafetySheets}</ListGroup>
      </div>
    );
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

    return (
      <div className="w-100 mt-0 ms-2">
        <InputGroup>
          <OverlayTrigger placement="top" overlay={<Tooltip id="renderChemProp">Info, if any found, will be copied to properties fields in sample properties tab</Tooltip>}>
            <Button
              id="fetch-properties"
              onClick={() => this.fetchChemicalProperties(vendor)}
              disabled={!!loadingQuerySafetySheets || !!loadChemicalProperties.loading}
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
          </OverlayTrigger>
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip id="viewChemProp">click to view fetched chemical properties</Tooltip>}
          >
            <Button
              active
              onClick={() => this.handlePropertiesModal(vendor)}
              variant="light"
            >
              <i className="fa fa-file-text" />
            </Button>
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
        variant="light"
        disabled={!!loadingQuerySafetySheets || checkSavedSds}
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
      <Tooltip id="disabledSdsSearchButton">delete saved sheets to enable search button</Tooltip>
    );

    return (
      <div className="mt-4">
        {button}
        {checkSavedSds && (
          <OverlayTrigger placement="top" overlay={overlay}>
            <div className="overlay-trigger-container" />
          </OverlayTrigger>
        )}
      </div>
    );
  }

  safetyTab() {
    const { displayWell } = this.state;
    return (
      <>
        <Row className="mb-3 align-items-end">
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
        {this.renderWarningMessage()}
        {this.renderSafetyPhrases()}
      </>
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

  renderWarningMessage() {
    const { warningMessage } = this.state;
    return (
      <div className="text-danger">
        {warningMessage !== '' ? warningMessage : null}
      </div>
    );
  }

  render() {
    const {
      chemical
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
