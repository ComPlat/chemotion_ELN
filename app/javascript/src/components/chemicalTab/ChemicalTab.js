/* eslint-disable no-underscore-dangle */
import React from 'react';
import PropTypes from 'prop-types';
import {
  Accordion, Form, Button, OverlayTrigger, Tooltip,
  InputGroup, Row, Col,
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
import SafetySheetsAttachments from 'src/components/chemicalTab/SafetySheetsAttachments';

export default class ChemicalTab extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      chemical: null,
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
      loadChemicalProperties: { loading: false, vendor: '' },
      switchRequiredOrderedDate: 'required',
      viewChemicalPropertiesModal: false,
      viewModalForVendor: ''
    };
    this.handleFieldChanged = this.handleFieldChanged.bind(this);
    this.handleMetricsChange = this.handleMetricsChange.bind(this);
    this.handleSubmitSave = this.handleSubmitSave.bind(this);
    this.handleCheckMark = this.handleCheckMark.bind(this);
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

  renderSafetySheets = () => {
    const { safetySheets, chemical } = this.state;
    return (
      <SafetySheetsAttachments
        safetySheets={safetySheets}
        chemical={chemical}
        sample={this.props.sample}
        handleUpdateSample={this.props.handleUpdateSample}
        handleFieldChanged={this.handleFieldChanged}
        handleSubmitSave={this.handleSubmitSave}
      />
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
    && chemical?._chemical_data?.[0]?.safetySheetPath?.length !== 0;
    console.log('safetySheetPath', chemical?._chemical_data?.[0]?.safetySheetPath);

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

  renderWarningMessage() {
    const { warningMessage } = this.state;
    return (
      <div className="text-danger">
        {warningMessage !== '' ? warningMessage : null}
      </div>
    );
  }

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

  render() {
    const {
      chemical
    } = this.state;

    const data = chemical?._chemical_data?.[0] ?? [];
    return (
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
