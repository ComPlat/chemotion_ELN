/* eslint-disable no-underscore-dangle */
import React from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, ControlLabel, FormControl, Button, OverlayTrigger, Tooltip, Well, ButtonToolbar,
  ListGroup, ListGroupItem, InputGroup
} from 'react-bootstrap';
import Select from 'react-select';
import SVG from 'react-inlinesvg';
import ChemicalFetcher from 'src/fetchers/ChemicalFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import Sample from 'src/models/Sample';

export default class ChemicalTab extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      chemical: undefined,
      safetySheets: [],
      checkSaveIconThermofischer: true,
      checkSaveIconMerck: true,
      vendorValue: 'All',
      vendorSafetyPhrasesValue: '',
      vendorChemPropertiesValue: '',
      queryOption: 'Common Name',
      safetySheetLanguage: 'en',
      safetyPhrases: ''
    };
    this.handleFieldChanged = this.handleFieldChanged.bind(this);
  }

  componentDidMount() {
    const { sample } = this.props;
    this.fetchChemical(sample);
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
    const { sample } = this.props;
    if (!sample || !chemical) {
      return;
    }
    const chemicalData = chemical._chemical_data || null;
    const cas = chemical._cas || null;
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
    } else {
      ChemicalFetcher.update(params).then((response) => {
        if (response) {
          this.setState({ chemical });
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    }
  }

  handleRemove(index, document) {
    const { safetySheets, chemical } = this.state;
    const parameters = chemical._chemical_data[0];
    if (safetySheets.length !== 0) {
      safetySheets.splice(index, 1);
      this.setState({ safetySheets });
    } else {
      if (document.alfa_link) {
        delete parameters.alfaProductInfo;
      } else if (document.merck_link) {
        delete parameters.merckProductInfo;
      }
      chemical._chemical_data[0].ssdPath.splice(index, 1);
      this.setState({ chemical });
      this.updateCheckMark(index, document);
    }
    this.handleSubmitSave();
  }

  handleCheckMark(vendor) {
    if (vendor === 'Thermofischer') {
      this.setState({ checkSaveIconThermofischer: false });
    } else if (vendor === 'Merck') {
      this.setState({ checkSaveIconMerck: false });
    }
  }

  handleVendorOption(value) {
    this.setState({ vendorValue: value });
  }

  handleVendorSafetyOption(value) {
    this.setState({ vendorSafetyPhrasesValue: value });
  }

  handleVendorChemPropOption(value) {
    this.setState({ vendorChemPropertiesValue: value });
  }

  handleQueryOption(value) {
    this.setState({ queryOption: value });
  }

  handleLanguageOption(value) {
    this.setState({ safetySheetLanguage: value });
  }

  querySafetySheets = () => {
    const { sample } = this.props;
    const sampleName = sample.showedName();
    const moleculeId = sample.molecule_name_hash ? sample.molecule_name_hash.mid : null;
    const {
      chemical, vendorValue, queryOption, safetySheetLanguage
    } = this.state;
    if (chemical) {
      chemical.buildChemical('sample_name', sampleName);
      chemical.buildChemical('molecule_id', moleculeId);
    }

    const queryParams = {
      id: moleculeId, vendor: vendorValue, queryOption, language: safetySheetLanguage
    };
    const { safetySheets } = this.state;

    ChemicalFetcher.fetchSafetySheets(queryParams).then((result) => {
      const obj = JSON.parse(result);
      safetySheets.splice(0, 1);
      this.setState({ safetySheets });
      this.setState({ safetySheets: Object.values(obj) });
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

    const style = {
      fontSize: '1.2em', fontWeight: 'bold', marginTop: '15px', marginBottom: '15px'
    };

    const pictogramsArray = str.pictograms.map((i) => (i !== null ? <SVG key={`ghs${i}`} src={`/images/ghs/${i}.svg`} /> : null));

    return (
      <div>
        <p style={style}>Pictograms: </p>
        {(str.pictograms !== undefined || str.pictograms.length !== 0)
          ? pictogramsArray : <p>Could not find pictograms</p>}
        <p style={style}>Hazard Statements: </p>
        {HazardPhrases}
        <p style={style}>Precautionary Statements: </p>
        {precautionaryPhrases}
      </div>
    );
  };

  fetchSafetyPhrases = (vendor) => {
    const { sample } = this.props;
    const queryParams = {
      vendor, id: sample.id
    };
    ChemicalFetcher.safetyPhrases(queryParams).then((result) => {
      if (result === 'Could not find H and P phrases' || result === 'Please fetch and save corresponding safety data sheet first') {
        const handleError = <p>{result}</p>;
        this.setState({ safetyPhrases: handleError });
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

    if (chemical && vendor === 'thermofischer') {
      productLink = chemical._chemical_data[0].alfaProductInfo ? chemical._chemical_data[0].alfaProductInfo.productLink : '';
    } else if (chemical && vendor === 'merck') {
      productLink = chemical._chemical_data[0].merckProductInfo ? chemical._chemical_data[0].merckProductInfo.productLink : '';
    }

    ChemicalFetcher.chemicalProperties(productLink).then((result) => {
      if (result === 'Could not find additional chemical properties' || result === null) {
        NotificationActions.add({
          message: 'Could not find additional chemical properties',
          level: 'error'
        });
      } else {
        Object.entries(result).forEach(([key, value]) => {
          this.handleFieldChanged(key, value);
        });
      }
    }).catch((errorMessage) => {
      console.log(errorMessage);
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

  mapToSampleProperties() {
    const { sample, parent } = this.props;
    const { chemical } = this.state;
    const chemicalData = chemical ? chemical._chemical_data[0] : [];
    if (chemicalData.boiling_point) {
      const boilingPoints = chemicalData.boiling_point.replace(/°C?/g, '').trim().split('-');
      const lowerBound = boilingPoints[0];
      const upperBound = boilingPoints.length === 2 ? boilingPoints[1] : Number.POSITIVE_INFINITY;
      sample.updateRange('boiling_point', lowerBound, upperBound);
    }

    if (chemicalData.melting_point) {
      const MeltingPoints = chemicalData.melting_point.replace(/°C?/g, '').trim().split('-');
      const lowerBound = MeltingPoints[0];
      const upperBound = MeltingPoints.length === 2 ? MeltingPoints[1] : Number.POSITIVE_INFINITY;
      sample.updateRange('melting_point', lowerBound, upperBound);
    }

    if (chemicalData.density) {
      const densityNumber = chemicalData.density.match(/[0-9.]+/g);
      sample.density = densityNumber[0];
    }
    parent.setState({ sample });
    ElementActions.updateSample(new Sample(sample), false);
  }

  chemicalStatus(data, label, parameter) {
    const val = data !== undefined ? data[parameter] : '';
    const statusOptions = [
      { label: 'Available', value: 'Available' },
      { label: 'Out of stock', value: 'Out of stock' }
    ];
    const noBoldLabel = { fontWeight: 'normal' };
    return (
      <FormGroup>
        <ControlLabel style={noBoldLabel}>{label}</ControlLabel>
        <InputGroup style={{ width: '100%', paddingRight: '10px' }}>
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
    const bsSize = parameter !== 'important_notes' && parameter !== 'disposal_info' ? 'small' : null;
    const componentClass = parameter !== 'important_notes' && parameter !== 'disposal_info' && parameter !== 'sensitivity_storage' 
    && parameter !== 'solubility' ? 'input' : 'textarea';
    const noBoldLabel = { fontWeight: 'normal' };
    let value;
    if (parameter !== 'cas') {
      value = data !== undefined ? data[parameter] : '';
    } else {
      value = data || '';
    }
    return (
      <FormGroup bsSize={bsSize}>
        <ControlLabel style={noBoldLabel}>{label}</ControlLabel>
        <FormControl
          componentClass={componentClass}
          id={`txinput_${label}`}
          type="text"
          value={value}
          onChange={(e) => { this.handleFieldChanged(parameter, e.target.value); }}
          rows={label !== 'Important notes' && label !== 'Disposal information' ? 1 : 2}
        />
      </FormGroup>
    );
  }

  textUnitInput(field, label, parameter) {
    const noBoldLabel = { fontWeight: 'normal' };
    let unit;
    let value;
    if (field && field[parameter]) {
      if ((parameter === 'melting_point' || parameter === 'boiling_point') && (field[parameter].includes('°C') || field[parameter].includes('°'))) {
        value = field[parameter] !== undefined ? field[parameter].replace('°C', '').replace('°', '') : '';
        unit = '°C';
      } else if ((parameter === 'melting_point' || parameter === 'boiling_point') && field[parameter].includes('°F') && !field[parameter].includes('°C')) {
        value = field[parameter] !== undefined ? field[parameter].replace('°F', '') : '';
        unit = '°F';
      } else if (parameter === 'density') {
        const densityArr = field[parameter] !== undefined ? field[parameter].match(/[0-9.]+/g) : [''];
        value = densityArr[0];
        unit = 'g/mL';
      }
    }

    return (
      <FormGroup bsSize="small">
        <ControlLabel style={noBoldLabel}>{label}</ControlLabel>
        <InputGroup>
          <FormControl
            type="text"
            value={value}
            onChange={(e) => this.handleFieldChanged(parameter, e.target.value)}
          />
          <InputGroup.Addon>{unit}</InputGroup.Addon>
        </InputGroup>
      </FormGroup>
    );
  }

  updateCheckMark(index, document) {
    if (document.alfa_link) {
      this.setState({ checkSaveIconThermofischer: true });
    } else if (document.merck_link) {
      this.setState({ checkSaveIconMerck: true });
    }
  }

  checkMarkButton(document) {
    const { checkSaveIconThermofischer, checkSaveIconMerck } = this.state;
    let outcome;
    if (document.alfa_link) {
      outcome = (checkSaveIconThermofischer && document.alfa_product_number !== undefined)
        ? null : (
          <OverlayTrigger placement="top" overlay={<Tooltip id="saveCheckIconThermo">Saved</Tooltip>}>
            <i className="fa fa-check-circle" style={{ paddingLeft: '10px' }} />
          </OverlayTrigger>
        );
    } else if (document.merck_link) {
      outcome = (checkSaveIconMerck && document.merck_product_number !== undefined) ? null : (
        <OverlayTrigger placement="top" overlay={<Tooltip id="saveCheckIconMerck">Saved</Tooltip>}>
          <i className="fa fa-check-circle" style={{ paddingLeft: '10px' }} />
        </OverlayTrigger>
      );
    }
    return outcome;
  }

  removeButton(index, document) {
    return (
      <Button
        bsSize="xsmall"
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
    if (productInfo.vendor === 'Thermofischer') {
      vendorProduct = 'alfaProductInfo';
    } else if (productInfo.vendor === 'Merck') {
      vendorProduct = 'merckProductInfo';
    }
    // update chemical data before saving it in the database
    this.handleFieldChanged(vendorProduct, productInfo);
    const params = {
      chemical_data: chemical._chemical_data,
      sample_id: sample.id,
      vendor_product: vendorProduct
    };
    ChemicalFetcher.saveSafetySheets(params).then((result) => {
      if (result || result === 'file is already saved') {
        const value = `/safety_sheets/${productInfo.productNumber}_${productInfo.vendor}.pdf`;
        const chemicalData = chemical._chemical_data;
        const pathArr = [];
        const pathParams = {};
        let vendorParams;
        if (productInfo.vendor === 'Thermofischer') {
          vendorParams = 'alfa_link';
        } else {
          vendorParams = 'merck_link';
        }
        pathParams[vendorParams] = value;
        if (chemicalData[0].ssdPath === undefined || chemicalData[0].ssdPath.length === 0) {
          pathArr.push(pathParams);
          this.handleFieldChanged('ssdPath', pathArr);
        } else if (chemicalData[0].ssdPath.length === 1 && chemicalData[0].ssdPath[0][vendorParams]
          === undefined) {
          chemicalData[0].ssdPath.push(pathParams);
        } else if (chemicalData[0].ssdPath.length === 1 && chemicalData[0].ssdPath[0][vendorParams]
          !== undefined && chemicalData[0].ssdPath[0][vendorParams] !== value) {
          chemicalData[0].ssdPath[0][vendorParams] = value;
        } else {
          for (let i = 0; i < chemicalData[0].ssdPath.length; i += 1) {
            if (chemicalData[0].ssdPath[i][vendorParams]
              !== undefined && chemicalData[0].ssdPath[i][vendorParams] !== value) {
              chemicalData[0].ssdPath[i][vendorParams] = value;
            }
          }
        }
        this.setState({ chemical });
        this.handleSubmitSave();
        this.handleCheckMark(productInfo.vendor);
      }
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  saveSafetySheets(sdsInfo) {
    let vendor;
    let sdsLink;
    let productNumber;
    let productLink;
    if (sdsInfo.alfa_link !== undefined) {
      vendor = 'Thermofischer';
      sdsLink = sdsInfo.alfa_link;
      productNumber = sdsInfo.alfa_product_number;
      productLink = sdsInfo.alfa_product_link;
    } else if (sdsInfo.merck_link !== undefined) {
      vendor = 'Merck';
      sdsLink = sdsInfo.merck_link;
      productNumber = sdsInfo.merck_product_number;
      productLink = sdsInfo.merck_product_link;
    }
    const productInfo = {
      vendor,
      sdsLink,
      productNumber,
      productLink,
    };
    return (
      <Button
        bsSize="xsmall"
        bsStyle="warning"
        disabled={!productNumber}
        onClick={() => this.saveSdsFile(productInfo)}
      >
        <i className="fa fa-save" />
      </Button>
    );
  }

  saveParameters() {
    return (
      <Button
        id="submit-sample-btn"
        bsStyle="warning"
        onClick={() => this.handleSubmitSave()}
      >
        Save
      </Button>
    );
  }

  chooseVendor() {
    const { vendorValue } = this.state;
    const vendorOptions = [
      { label: 'All', value: 'All' },
      { label: 'Merck', value: 'Merck' },
      { label: 'Thermofischer', value: 'Thermofischer' },
      // { label: 'ChemicalSafety', value: 'ChemicalSafety' }
    ];

    return (
      <FormGroup style={{ width: '100%' }}>
        <ControlLabel style={{ paddingRight: '100px' }}>Vendor</ControlLabel>
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
      <FormGroup style={{ width: '100%' }}>
        <ControlLabel style={{ paddingRight: '25px' }}>Query SSD using</ControlLabel>
        <Select
          name="queryOption"
          clearable={false}
          options={queryOptions}
          onChange={(e) => this.handleQueryOption(e.value)}
          value={queryOption}
        />
      </FormGroup>
    );
  }

  safetySheetLanguage() {
    const { safetySheetLanguage } = this.state;
    const languageOptions = [
      { label: 'English', value: 'en' },
      { label: 'Deustch', value: 'de' },
      { label: 'French', value: 'fr' },
    ];

    return (
      <FormGroup style={{ width: '100%' }}>
        <ControlLabel style={{ paddingRight: '25px' }}>Choose Language of SSD</ControlLabel>
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

  renderSafetySheets = () => {
    const { safetySheets, chemical } = this.state;
    let sdsStatus;
    let savedSds;
    if (chemical) {
      if (chemical._chemical_data !== undefined && chemical._chemical_data.length !== 0) {
        savedSds = chemical._chemical_data[0].ssdPath;
        sdsStatus = safetySheets.length !== 0 ? safetySheets : savedSds;
      }
    }
    return (
      (sdsStatus === undefined || sdsStatus.length === 0) ? null : (
        <ListGroup>
          {sdsStatus.map((document, index) => (
            document !== 'Could not find safety data sheet' ? (
              <ListGroupItem key="safetySheetsFiles">
                <div>
                  <a href={(document.alfa_link !== undefined) ? document.alfa_link : document.merck_link} target="_blank" style={{ cursor: 'pointer' }} rel="noreferrer">
                    {(document.alfa_link !== undefined) ? 'Safety Data Sheet from Thermofischer' : 'Safety Data Sheet from Merck'}
                    { this.checkMarkButton(document) }
                  </a>
                  <ButtonToolbar className="pull-right">
                    {this.saveSafetySheets(document)}
                    {this.removeButton(index, document)}
                  </ButtonToolbar>
                </div>
              </ListGroupItem>
            )
              : (
                <ListGroupItem>
                  <div>
                    <p>
                      {(index === 0) ? 'Could not find safety data sheet from Thermofischer' : 'Could not find safety Data Sheet from Merck'}
                    </p>
                  </div>
                </ListGroupItem>
              )
          ))}
        </ListGroup>
      )
    );
  };

  chooseVendorForSafetyPhrases() {
    const { vendorSafetyPhrasesValue } = this.state;
    const vendorOptions = [
      { label: 'merck', value: 'merck' },
      { label: 'thermofischer', value: 'thermofischer' },
    ];

    return (
      <FormGroup>
        <ControlLabel style={{ paddingRight: '100px' }}>Choose Vendor</ControlLabel>
        <Select
          name="chemicalVendorforSafetyPhrases"
          clearable={false}
          options={vendorOptions}
          onChange={(e) => this.handleVendorSafetyOption(e.value)}
          value={vendorSafetyPhrasesValue}
        />
      </FormGroup>
    );
  }

  renderSafetyPhrases = () => {
    const { chemical, vendorSafetyPhrasesValue, safetyPhrases } = this.state;
    let fetchedSafetyPhrases;
    if (chemical && chemical._chemical_data !== undefined && chemical._chemical_data.length !== 0) {
      const phrases = chemical._chemical_data[0].safetyPhrases;
      fetchedSafetyPhrases = (phrases !== undefined) ? this.stylePhrases(phrases) : '';
    }
    return (
      <table>
        <tbody>
          <tr>
            <td>
              <div style={{ width: '%100', display: 'flex', justifyContent: 'justify' }}>
                <div style={{ width: '%50', paddingRight: '20px' }}>
                  {this.chooseVendorForSafetyPhrases()}
                </div>
                <div style={{ width: '%50', paddingTop: '25px' }}>
                  <Button
                    id="safetyPhrases-btn"
                    onClick={() => this.fetchSafetyPhrases(vendorSafetyPhrasesValue)}
                  >
                    fetch Safety Phrases
                  </Button>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <div style={{ width: '100%', paddingTop: '10px'}}>
                {safetyPhrases === '' ? fetchedSafetyPhrases : safetyPhrases}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    );
  };

  chooseVendorForChemicalProperties() {
    const { vendorChemPropertiesValue } = this.state;
    const vendorOptions = [
      { label: 'merck', value: 'merck' },
      { label: 'thermofischer', value: 'thermofischer' },
    ];

    return (
      <FormGroup>
        <ControlLabel style={{ paddingRight: '100px' }}>Choose Vendor</ControlLabel>
        <Select
          name="chemicalVendorforSafetyPhrases"
          clearable={false}
          options={vendorOptions}
          onChange={(e) => this.handleVendorChemPropOption(e.value)}
          value={vendorChemPropertiesValue}
        />
      </FormGroup>
    );
  }

  renderChemicalProperties = () => {
    const { vendorChemPropertiesValue } = this.state;

    return (
      <table>
        <tbody>
          <tr>
            <td>
              <div style={{ width: '%100', display: 'flex', justifyContent: 'justify' }}>
                <div style={{ width: '%30', paddingRight: '20px' }}>
                  {this.chooseVendorForChemicalProperties()}
                </div> 
                <div style={{ width: '%30', paddingTop: '25px', paddingRight: '20px' }}>
                  <Button
                    id="safetyPhrases-btn"
                    onClick={() => this.fetchChemicalProperties(vendorChemPropertiesValue)}
                  >
                    fetch Chemical Properties
                  </Button>
                </div>
                <div style={{ width: '%30', paddingTop: '25px' }}>
                  <Button
                    id="mapSampleProperties-btn"
                    onClick={() => this.mapToSampleProperties()}
                  >
                    copy fetched data to sample properties
                  </Button>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    );
  };

  render() {
    const {
      chemical
    } = this.state;
    let cas;
    let data;

    if (chemical) {
      data = chemical._chemical_data ? chemical._chemical_data[0] : [];
      cas = chemical ? chemical._cas : null;
    }

    const styleBorderless = { borderStyle: 'none' };

    const styleHeader = { paddingBottom: '10px', fontWeight: 'bold', fontSize: '17px' };

    return (
      <table className="table table-borderless">
        <tbody>
          <tr>
            <th style={styleHeader}> Labels</th>
          </tr>
          <tr>
            <td colSpan="5" style={styleBorderless}>
              <div className="drop-bottom" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '25%' }}>
                  {this.chemicalStatus(data, 'Status', 'status')}
                </div>
                <div style={{ width: '15%' }}>
                  {this.textInput(cas, 'CAS', 'cas')}
                </div>
                <div style={{ width: '15%' }}>
                  {this.textInput(data, 'Internal label', 'internal_label')}
                </div>
                <div style={{ width: '15%' }}>
                  {this.textInput(data, 'Purity', 'purity')}
                </div>
                <div style={{ width: '15%' }}>
                  {this.textInput(data, 'Details', 'details')}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <th style={styleHeader}> Chemical Properties</th>
          </tr>
          <tr>
            <td style={styleBorderless}>
              {this.renderChemicalProperties()}
            </td>
          </tr>
          <tr>
            <td colSpan="4" style={styleBorderless}>
              <div className="drop-bottom" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '20%' }}>
                  {this.textInput(data, 'Form', 'form')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textUnitInput(data, 'Density', 'density')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textUnitInput(data, 'Melting Point', 'melting_point')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textUnitInput(data, 'Boiling Point', 'boiling_point')}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan="3" style={styleBorderless}>
              <div className="drop-bottom" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '20%' }}>
                  {this.textInput(data, 'Flash Point', 'flash_point')}
                </div>
                <div style={{ width: '30%' }}>
                  {this.textInput(data, 'Refractive Index', 'refractive_index')}
                </div>
                <div style={{ width: '40%' }}>
                  {this.textInput(data, 'Solubility', 'solubility')}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <div style={{ width: '90%' }}>
              {this.textInput(data, 'Sensitivity and Storage', 'sensitivity_storage')}
            </div>
          </tr>
          <tr>
            <th style={styleHeader}> History</th>
          </tr>
          <tr>
            <td colSpan="4" style={styleBorderless}>
              <div className="drop-bottom" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '20%' }}>
                  {this.textInput(data, 'Vendor', 'vendor')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(data, 'Order number', 'order_number')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(data, 'Person', 'person')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(data, 'Date', 'date')}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan="4" style={styleBorderless}>
              <div className="drop-bottom" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '20%' }}>
                  {this.textInput(data, 'Price', 'price')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(data, 'Amount', 'amount')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(data, 'Product Link', 'link')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(data, 'Other information', 'other_information')}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <th style={styleHeader}> Location and Information</th>
          </tr>
          <tr>
            <td colSpan="4" style={styleBorderless}>
              <div className="drop-bottom" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '20%' }}>
                  {this.textInput(data, 'Room - cabinet', 'room')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(data, 'Building', 'building')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(data, 'Group', 'group')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(data, 'Owner', 'owner')}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <th style={styleHeader}> Safety</th>
          </tr>
          <tr>
            <td colSpan="4" style={styleBorderless}>
              <div className="drop-bottom" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  {this.textInput(data, 'Vendors saftey data sheet link', 'sds_link')}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan="4" style={styleBorderless}>
              <div style={{ width: '%100', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '%100' }}>
                  {this.chooseVendor()}
                </div>
                <div style={{ width: '%100' }}>
                  {this.queryOption()}
                </div>
                <div style={{ width: '%100' }}>
                  {this.safetySheetLanguage()}
                </div>
                <div style={{ width: '%100', paddingTop: '25px' }}>
                  <Button
                    id="submit-sds-btn"
                    onClick={() => this.querySafetySheets()}
                  >
                    Search for SDS
                  </Button>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <div>
              <Well style={{ minHeight: 70, padding: 5, paddingBottom: 31 }}>
                <div>
                  {this.renderSafetySheets()}
                </div>
              </Well>
            </div>
          </tr>
          <tr>
            <th style={styleHeader}> Safety Phrases</th>
          </tr>
          <tr>
            <td style={styleBorderless}>
              {this.renderSafetyPhrases()}
            </td>
          </tr>
          <tr>
            <th style={styleHeader}> Disposal / Helpful Notes</th>
          </tr>
          <tr>
            <td colSpan="1" style={styleBorderless}>
              <div className="drop-bottom">
                <div style={{ width: '100%' }}>
                  {this.textInput(data, 'Disposal information', 'disposal_info')}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan="1" style={styleBorderless}>
              <div className="drop-bottom">
                <div style={{ width: '100%' }}>
                  {this.textInput(data, 'Important notes', 'important_notes')}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style={styleBorderless}>
              <div>
                {this.saveParameters()}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    );
  }
}

ChemicalTab.propTypes = {
  sample: PropTypes.object
};
