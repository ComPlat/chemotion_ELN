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
      anti: false,
      safetySheets: [],
      displayWell: false,
      checkSaveIconThermofischer: false,
      checkSaveIconMerck: false,
      vendorValue: 'All',
      vendorSafetyPhrasesValue: '',
      vendorChemPropertiesValue: '',
      queryOption: 'CAS',
      safetySheetLanguage: 'en',
      safetyPhrases: '',
      warningMessage: '',
      loading: false,
      loadChemicalProperties: false,
      openInventoryInformationTab: false,
      openSafetyTab: false,
      openLocationTab: false,
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
    const { saveInventory, parent, pendingToSave } = this.props;
    const { chemical } = this.state;

    if (prevState.chemical !== chemical) {
      this.updateDisplayWell();
    }

    // if (chemical && prevState.chemical) {
    //   console.log(prevState.chemical.chemical_data === chemical.chemical_data);
    //   // console.log(chemical.chemical_data);
    //   console.log('prove of concept');
    // }

    // console.log(prevProps);
    // console.log(this.props);

    // if (prevProps && prevState.chemical) {
    //   console.log(prevState.chemical.chemical_data === chemical.chemical_data);
    //   // console.log(chemical.chemical_data);
    //   console.log('prove of concept');
    // }

    if (saveInventory === true) {
      console.log('say hello to mama');
      this.handleSubmitSave();
      console.log(saveInventory);
    }

    if (chemical) {
      if (chemical.changed === true && pendingToSave === false) {
        console.log(prevState.chemical);
        // console.log(chemical._chemical_data[0] === prevState.chemical._chemical_data[0]);
        // console.log(prevState.chemical._chemical_data[0]);
        // console.log(chemical._chemical_data[0]);
        console.log('maybe');
        console.log(chemical);
        this.inventoryPendingToSave();
      }
    }
  }

  handleFieldChanged(parameter, value) {
    console.log(`handleFieldChanged: ${JSON.stringify(parameter)} = ${value}`);
    const { chemical } = this.state;
    console.log(chemical);
    if (chemical) {
      chemical.buildChemical(parameter, value);
    }
    this.setState({ chemical});
    console.log(chemical);
  }

  handleSubmitSave() {
    const { chemical } = this.state;
    const { sample, parent } = this.props;
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
    console.log(chemical);
  }

  handleRemove(index, document) {
    const { safetySheets, chemical } = this.state;
    const parameters = chemical._chemical_data[0];
    let sdsIndex;
    if (safetySheets.length !== 0) {
      safetySheets.splice(index, 1);
      this.setState({ safetySheets });
    }
    if (chemical._chemical_data[0].ssdPath.length > 0) {
      const { ssdPath } = chemical._chemical_data[0];
      if (ssdPath[0]?.alfa_link && document.alfa_link) {
        const alfaIndex = ssdPath.findIndex((element) => element.alfa_link);
        sdsIndex = ssdPath[alfaIndex].alfa_link;
        console.log(sdsIndex);
        delete parameters.alfaProductInfo;
        chemical._chemical_data[0].ssdPath.splice(sdsIndex, 1);
      } else if (ssdPath[0]?.merck_link && document.merck_link) {
        const merckIndex = ssdPath.findIndex((element) => element.merck_link);
        sdsIndex = ssdPath[merckIndex].merck_link;
        console.log(sdsIndex);
        delete parameters.merckProductInfo;
        chemical._chemical_data[0].ssdPath.splice(sdsIndex, 1);
      }
      console.log(sdsIndex);
      console.log(chemical);
      this.setState({ chemical });
      this.handleSubmitSave();
    }
    this.setState({ warningMessage: '' });
    this.updateCheckMark(document);
    // console.log('here', chemical);
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
    this.setState({ loading: true });
    const sampleName = sample.showedName();
    const moleculeId = sample.molecule_name_hash ? sample.molecule_name_hash.mid : null;
    const {
      chemical, vendorValue, queryOption, safetySheetLanguage
    } = this.state;
    console.log(chemical);
    if (chemical) {
      chemical.buildChemical('sample_name', sampleName);
      chemical.buildChemical('molecule_id', moleculeId);
    }
    let searchStr;

    if (queryOption === 'Common Name') {
      searchStr = sample.molecule_name_hash.label;
    } else {
      console.log(sample);
      const sampleCas = sample.xref.cas ? sample.xref.cas : '';
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
      console.log(`result: ${JSON.stringify(obj)}`);
      safetySheets.splice(0, 1);
      this.setState({ safetySheets });
      this.setState({ safetySheets: Object.values(obj) });
      this.setState({ loading: false });
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
    const warningMessage = 'Please fetch and save corresponding safety data sheet first';
    this.setState({ warningMessage: '' });
    ChemicalFetcher.safetyPhrases(queryParams).then((result) => {
      console.log(result);
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
    this.setState({ loadChemicalProperties: true });
    this.setState({ warningMessage: '' });

    if (chemical && vendor === 'thermofischer') {
      productLink = chemical._chemical_data[0].alfaProductInfo ? chemical._chemical_data[0].alfaProductInfo.productLink : '';
    } else if (chemical && vendor === 'merck') {
      productLink = chemical._chemical_data[0].merckProductInfo ? chemical._chemical_data[0].merckProductInfo.productLink : '';
    }
    const warningMessage = 'Please fetch and save corresponding safety data sheet first';
    console.log(vendor);
    console.log(chemical._chemical_data[0].alfaProductInfo);

    ChemicalFetcher.chemicalProperties(productLink).then((result) => {
      this.setState({ loadChemicalProperties: false });
      if (result === 'Could not find additional chemical properties' || result === null) {
        this.setState({ warningMessage });
      } else {
        // Object.entries(result).forEach(([key, value]) => {
        //   this.handleFieldChanged(key, value);
        // });
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

  // mapToSampleProperties(vendor) {
  //   const { sample, parent } = this.props;
  //   const { chemical } = this.state;
  //   const chemicalData = chemical?._chemical_data[0] || [];
  //   let properties = {};
  //   if (vendor === 'thermofischer') {
  //     properties = chemicalData.alfaProductInfo.properties;
  //     console.log(properties);
  //   } else if (vendor === 'merck') {
  //     properties = chemicalData.merckProductInfo.properties;
  //   }
  //   if (properties.boiling_point) {
  //     const boilingPoints = properties.boiling_point.replace(/°C?/g, '').trim().split('-');
  //     const lowerBound = boilingPoints[0];
  //     const upperBound = boilingPoints.length === 2 ? boilingPoints[1] : Number.POSITIVE_INFINITY;
  //     sample.updateRange('boiling_point', lowerBound, upperBound);
  //   }

  //   if (properties.melting_point) {
  //     const MeltingPoints = properties.melting_point.replace(/°C?/g, '').trim().split('-');
  //     const lowerBound = MeltingPoints[0];
  //     const upperBound = MeltingPoints.length === 2 ? MeltingPoints[1] : Number.POSITIVE_INFINITY;
  //     sample.updateRange('melting_point', lowerBound, upperBound);
  //   }

  //   if (properties.density) {
  //     const densityNumber = properties.density.match(/[0-9.]+/g);
  //     sample.density = densityNumber[0];
  //   }
  //   console.log(sample);
  //   console.log(properties);

  //   if (properties.flash_point) {
  //     const { flash_point } = properties;
  //     sample.xref.flash_point = flash_point;
  //   }

  //   if (properties.form) {
  //     console.log('I was here');
  //     const { form } = properties;
  //     console.log(sample);
  //     sample.xref.form = form;
  //     console.log(sample);
  //   }

  //   if (properties.color) {
  //     const { color } = properties;
  //     sample.xref.color = color;
  //   }

  //   if (properties.refractive_index) {
  //     const { refractive_index } = properties;
  //     sample.xref.refractive_index = refractive_index;
  //   }
  //   if (properties.solubility) {
  //     const { solubility } = properties;
  //     sample.xref.solubility = solubility;
  //   }
  //   parent.setState({ sample });
  //   console.log(parent);
  //   ElementActions.updateSample(new Sample(sample), false);
  // }

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

    console.log(sample.xref.flash_point);

    sample.xref.flash_point = {
      unit: '°C',
      value: properties.flash_point
    };

    const densityNumber = properties.density?.match(/[0-9.]+/g);
    if (densityNumber) {
      sample.density = densityNumber[0];
    }

    // sample.xref.flash_point = properties.flash_point || sample.xref.flash_point;
    sample.xref.form = properties.form || sample.xref.form;
    sample.xref.color = properties.color || sample.xref.color;
    sample.xref.refractive_index = properties.refractive_index || sample.xref.refractive_index;
    sample.xref.solubility = properties.solubility || sample.xref.solubility;

    parent.setState({ sample });
    ElementActions.updateSample(new Sample(sample), false);
  }

  chemicalStatus(data, label, parameter) {
    const val = data !== undefined ? data[parameter] : '';
    const statusOptions = [
      { label: 'Available', value: 'Available' },
      { label: 'Out of stock', value: 'Out of stock' },
      { label: 'To be ordered', value: 'To be ordered' },
      { label: 'Ordered', value: 'Ordered' }
    ];
    // const noBoldLabel = { fontWeight: 'normal' };
    return (
      <FormGroup>
        <ControlLabel>{label}</ControlLabel>
        <InputGroup style={{ width: '100%' }}>
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
    const parametersArr = ['important_notes', 'disposal_info', 'vendor', 'order_number', 'price'];
    // const bsSize = !parametersArr.includes(parameter) ? 'small' : null;
    const componentClass = parameter !== 'important_notes' && parameter !== 'disposal_info' && parameter !== 'sensitivity_storage'
    && parameter !== 'solubility' ? 'input' : 'textarea';
    // const noBoldLabel = { fontWeight: 'normal' };
    let value;
    if (parameter !== 'cas') {
      value = data !== undefined ? data[parameter] : '';
    } else {
      value = data || '';
      console.log(`data: ${value}`);
    }
    let conditionalOverlay;
    if (parameter === 'date') {
      conditionalOverlay = 'please enter the name of the person who orders/ordered the substance';
    } else if (parameter === 'required_by') {
      conditionalOverlay = 'please enter the name of the person who requires the substance';
    } else {
      conditionalOverlay = null;
    }
    const checkLabel = label !== 'Date' ? <ControlLabel>{label}</ControlLabel> : null;
    return (
      <OverlayTrigger placement="top" overlay={parameter === 'date' || parameter === 'required_by' ? <Tooltip>{conditionalOverlay}</Tooltip> : <div />}>
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
        <Button active className="clipboardBtn" data-clipboard-text={value} bsSize="xsmall">
          <i className="fa fa-clipboard" />
        </Button>
      </OverlayTrigger>
      // <InputGroup className="sample-molecule-identifier">
      //   {/* <FormGroup bsSize="small">
      //     <ControlLabel>{label}</ControlLabel>
      //     <FormControl
      //       id={`textInput_${label}`}
      //       componentClass="textarea"
      //       type="text"
      //       value={value}
      //       onChange={(e) => { this.handleFieldChanged(parameter, e.target.value); }}
      //       // rows={label !== 'Important notes' && label !== 'Disposal information' ? 1 : 2}
      //     />
      //   </FormGroup> */}
      //   <InputGroup.Button>
      //     <OverlayTrigger placement="bottom" overlay={this.clipboardTooltip()}>
      //       <Button active className="clipboardBtn" data-clipboard-text={value}>
      //         <i className="fa fa-clipboard" />
      //       </Button>
      //     </OverlayTrigger>
      //   </InputGroup.Button>
      // </InputGroup>
    );
  }

  locationInput(data, parameter, domain) {
    const value = data !== undefined ? data[parameter] : '';
    const subLabel = (parameter.split('_'))[1];
    const string = domain.replace(/_/g, ' ');
    const modifyStr = string.charAt(0).toUpperCase() + string.slice(1);
    const ParentLabelCondition = ['host_building', 'current_building', 'host_group', 'current_group'];
    const ParentLabel = ParentLabelCondition.includes(parameter)
      ? <ControlLabel>{modifyStr}</ControlLabel> : <ControlLabel style={{ paddingTop: '15px' }}> </ControlLabel>;
    const paramsObj = {};
    paramsObj[domain] = parameter;
    // const obj = data.parameter ? data.parameter[domain] : paramsObj;
    // console.log(data.parameter);

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
              // disabled
              // readOnly
            />
          </FormGroup>
        </InputGroup>
      </div>
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

  handleMetricsChange(parameter, newValue, newUnit) {
    console.log(`newUnit ${newUnit}`);
    console.log(`newValue ${newValue}`);
    const paramObj = { unit: newUnit, value: newValue };
    console.log(paramObj);
    this.handleFieldChanged(parameter, paramObj);
  }

  numInputWithoutTable(data, label, parameter) {
    const value = data !== undefined && data[parameter]
    && data[parameter].value ? data[parameter].value : 0;
    const unit = data !== undefined && data[parameter] && data[parameter].unit ? data[parameter].unit : 'mg';
    return (
      <NumericInputUnit
        field="inventory_amount"
        // bsStyle="default"
        inputDisabled={false}
        onInputChange={
          (newValue, newUnit) => this.handleMetricsChange(parameter, newValue, newUnit)
        }
        unit={unit}
        numericValue={value}
        // bsStyleBtnAfter="primary"
        label={label}
      />
    );
  }

  // onCasSelectOpen(e) {
  //   const { sample } = this.props;
  // }

  // onChangeCas = (e) => {
  //   // console.log(e);
  //   const value = e ? e.value : '';
  //   this.handleFieldChanged('cas', value);
  // };

  // casNumber(data, label) {
  //   const { chemical } = this.state;
  //   const { sample } = this.props;
  //   const { molecule } = sample;
  //   const val = data !== undefined ? data : 'hola';
  //   const noBoldLabel = { fontWeight: 'normal' };
  //   // const onOpen = (e) => this.onCasSelectOpen(e);
  //   let statusOptions = [];

  //   if (molecule && molecule.cas) {
  //     const fetchCas = molecule.cas.map((c) => ({ label: c, value: c }));
  //     statusOptions = fetchCas;
  //   }

  //   if (chemical) {
  //     const cas = chemical._cas ? chemical._cas : '';
  //     const casObject = [
  //       { label: cas, value: cas }
  //     ];
  //     const valuesArr = statusOptions.map(({ value }) => value) || [];
  //     statusOptions = cas !== '' && !valuesArr.includes(cas) ? statusOptions.concat(casObject) : statusOptions;
  //   }
  //   const onChange = (e) => this.onChangeCas(e);
  //   return (
  //     <FormGroup>
  //       <ControlLabel style={noBoldLabel}>{label}</ControlLabel>
  //       <InputGroup className="cas-number" style={{ width: '100%', paddingRight: '10px' }}>
  //         <Select.Creatable
  //           name="cas"
  //           multi={false}
  //           options={statusOptions}
  //           onChange={onChange}
  //           // onOpen={onOpen}
  //           value={val || ''}
  //           clearable
  //         />
  //       </InputGroup>
  //     </FormGroup>
  //   );
  // }

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
            <i className="fa fa-check-circle" style={{ paddingLeft: '10px', color: 'green' }} />
          </OverlayTrigger>
        );
    } else if (document.merck_link) {
      checkMark = (!checkSaveIconMerck && document.merck_product_number !== undefined) ? null : (
        <OverlayTrigger placement="top" overlay={<Tooltip id="saveCheckIconMerck">Saved</Tooltip>}>
          <i className="fa fa-check-circle" style={{ paddingLeft: '7px', color: 'green' }} />
        </OverlayTrigger>
      );
    }
    return checkMark;
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
    if (productInfo.vendor === 'Thermofisher') {
      vendorProduct = 'alfaProductInfo';
    } else if (productInfo.vendor === 'Merck') {
      vendorProduct = 'merckProductInfo';
    }
    console.log('before', chemical);
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
        if (productInfo.vendor === 'Thermofisher') {
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
        console.log(chemical);
        this.setState({ chemical });
        // this.handleFieldChanged('link', productInfo.productLink);
        this.handleSubmitSave();
        this.handleCheckMark(productInfo.vendor);
      }
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  /* eslint-disable camelcase */
  // saveSafetySheetsButton(sdsInfo, index) {
  //   const { checkSaveIconMerck, checkSaveIconThermofischer, chemical } = this.state;
  //   const ssdPath = (chemical?._chemical_data?.[0]?.ssdPath) || [];
  //   const {
  //     alfa_link, alfa_product_number, alfa_product_link, merck_link, merck_product_number,
  //     merck_product_link
  //   } = sdsInfo;

  //   const sdsLink = alfa_link || merck_link;
  //   const productNumber = alfa_product_number || merck_product_number;
  //   const productLink = alfa_product_link || merck_product_link;
  //   const vendor = sdsLink === alfa_link ? 'Thermofisher' : 'Merck';

  //   const checkMark = sdsLink === sdsInfo.alfa_link
  //     ? checkSaveIconThermofischer || Boolean(ssdPath?.[index]?.alfa_link)
  //     : checkSaveIconMerck || Boolean(ssdPath?.[index]?.merck_link);

  //   const productInfo = {
  //     vendor,
  //     sdsLink,
  //     productNumber,
  //     productLink,
  //   };
  //   console.log(productInfo);

  //   return (
  //     <Button
  //       bsSize="xsmall"
  //       bsStyle="warning"
  //       disabled={checkMark}
  //       onClick={() => this.saveSdsFile(productInfo)}
  //     >
  //       <i className="fa fa-save" />
  //     </Button>
  //   );
  // }

  saveSafetySheetsButton(sdsInfo, index) {
    const { checkSaveIconMerck, checkSaveIconThermofischer, chemical } = this.state;
    let vendor;
    let sdsLink;
    let productNumber;
    let productLink;
    let checkMark;
    if (chemical && chemical._chemical_data) {
      const { ssdPath } = chemical._chemical_data[0] || [];
      if (sdsInfo.alfa_link !== undefined) {
        vendor = 'Thermofisher';
        sdsLink = sdsInfo.alfa_link;
        productNumber = sdsInfo.alfa_product_number;
        productLink = sdsInfo.alfa_product_link;
        const hasAlfaLink = Boolean(ssdPath?.[index]?.alfa_link);
        checkMark = checkSaveIconThermofischer || hasAlfaLink;
      } else if (sdsInfo.merck_link !== undefined) {
        vendor = 'Merck';
        sdsLink = sdsInfo.merck_link;
        productNumber = sdsInfo.merck_product_number;
        productLink = sdsInfo.merck_product_link;
        const hasMerckLink = Boolean(ssdPath?.[index]?.merck_link);
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
        bsSize="xsmall"
        bsStyle="warning"
        disabled={checkMark}
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
      { label: 'Thermofisher', value: 'Thermofisher' },
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
      <OverlayTrigger placement="top" overlay={<Tooltip id="ssd-query-message">Assign a cas number using the cas field in labels section for better search results using cas number</Tooltip>}>
        <FormGroup style={{ width: '100%' }}>
          <ControlLabel style={{ paddingRight: '25px' }}>Query SDS using</ControlLabel>
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
      { label: 'Deustch', value: 'de' },
      { label: 'French', value: 'fr' },
    ];

    return (
      <FormGroup style={{ width: '100%' }}>
        <ControlLabel style={{ paddingRight: '25px' }}>Choose Language of SDS</ControlLabel>
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

  // extractProductLink(document) {

  // }

  renderWarningMessage() {
    const { warningMessage } = this.state;
    return (
      <div className="text-danger" style={{ width: '100%', paddingTop: '10px' }}>
        { warningMessage !== '' ? warningMessage : null }
      </div>
    );
  }

  // renderSafetySheets = () => {
  //   const { safetySheets, chemical, vendorValue, displayWell, safetyPhrases, warningMessage } = this.state;
  //   let sdsStatus;
  //   let savedSds;
  //   if (chemical) {
  //     if (chemical._chemical_data !== undefined && chemical._chemical_data.length !== 0) {
  //       savedSds = chemical._chemical_data[0].ssdPath;
  //       sdsStatus = safetySheets.length !== 0 ? safetySheets : savedSds;
  //     }
  //   }
  //   return (
  //     (sdsStatus === undefined || sdsStatus.length === 0) ? null
  //       : (
  //         <ListGroup>
  //           {sdsStatus.map((document, index) => (
  //             document !== 'Could not find safety data sheet from Thermofisher' && document !== 'Could not find safety data sheet from Merck' ? (
  //               <div className="safety-sheets-form" style={{ width: '100%', marginTop: '15px' }}>
  //                 <ListGroupItem key="safetySheetsFiles">
  //                   <div style={{ width: '100%', marginTop: '10px', marginBottom: '10px' }}>
  //                     <div className="drop-bottom" style={{ display: 'flex' }}>
  //                       <div style={{ paddingTop: '5px', paddingRight: '10px', width: '50%' }}>
  //                         <a href={(document.alfa_link !== undefined) ? document.alfa_link : document.merck_link} target="_blank" style={{ cursor: 'pointer' }} rel="noreferrer">
  //                           {(document.alfa_link !== undefined) ? 'Safety Data Sheet from Thermofisher' : 'Safety Data Sheet from Merck'}
  //                           { this.checkMarkButton(document) }
  //                         </a>
  //                       </div>
  //                       <div style={{ width: '16%', paddingTop: '5px' }}>
  //                         <ButtonToolbar>
  //                           {this.copyButton(document)}
  //                           {this.saveSafetySheets(document)}
  //                           {this.removeButton(index, document)}
  //                         </ButtonToolbar>
  //                       </div>
  //                       <div style={{ width: '45%' }}>
  //                         { document.alfa_link !== undefined ? this.renderChemicalProperties('thermofischer') : this.renderChemicalProperties('merck') }
  //                       </div>
  //                       <div style={{ width: '20%' }}>
  //                         { document.alfa_link !== undefined ? this.querySafetyPhrases('thermofischer') : this.querySafetyPhrases('merck') }
  //                       </div>
  //                     </div>
  //                   </div>
  //                 </ListGroupItem>
  //               </div>
  //             )
  //               : (
  //                 <ListGroupItem>
  //                   <div>
  //                     <p style={{ paddingTop: '10px' }}>
  //                       {document}
  //                     </p>
  //                   </div>
  //                 </ListGroupItem>
  //               )
  //           ))}
  //         </ListGroup>
  //       )
  //   );
  // };
  renderChildElements = (document, index) => (
    <div style={{ width: '100%', marginTop: '10px', marginBottom: '10px' }}>
      <div className="drop-bottom" style={{ display: 'flex' }}>
        <div style={{ paddingTop: '5px', paddingRight: '10px', width: '50%' }}>
          <a href={(document.alfa_link !== undefined) ? document.alfa_link : document.merck_link} target="_blank" style={{ cursor: 'pointer' }} rel="noreferrer">
            {(document.alfa_link !== undefined) ? 'Safety Data Sheet from Thermofisher' : 'Safety Data Sheet from Merck'}
            { this.checkMarkButton(document) }
          </a>
        </div>
        <div style={{ width: '16%', paddingTop: '5px' }}>
          <ButtonToolbar>
            {this.copyButton(document)}
            {this.saveSafetySheetsButton(document, index)}
            {this.removeButton(index, document)}
          </ButtonToolbar>
        </div>
        <div style={{ width: '45%' }}>
          { document.alfa_link !== undefined ? this.renderChemicalProperties('thermofischer') : this.renderChemicalProperties('merck') }
        </div>
        <div style={{ width: '20%' }}>
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
    const savedSds = chemical._chemical_data[0].ssdPath;
    const sdsStatus = safetySheets.length ? safetySheets : savedSds;
    console.log(safetySheets.length);

    return (
      <ListGroup>
        {sdsStatus.map((document, index) => (
          <div className="safety-sheets-form" style={{ width: '100%', marginTop: '15px' }} key="documentExist">
            {document !== 'Could not find safety data sheet from Thermofisher' && document !== 'Could not find safety data sheet from Merck' ? (
              <ListGroupItem key="safetySheetsFiles">
                {this.renderChildElements(document, index)}
              </ListGroupItem>
            ) : (
              <ListGroupItem key="noDocument">
                <div>
                  <p style={{ paddingTop: '10px' }}>
                    {document}
                  </p>
                </div>
              </ListGroupItem>
            )}
          </div>
        ))}
      </ListGroup>
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

  querySafetyPhrases = (vendor) => {
    return (
      <div>
        <Button
          id="safetyPhrases-btn"
          onClick={() => this.fetchSafetyPhrases(vendor)}
        >
          fetch Safety Phrases
        </Button>
      </div>
    );
  };

  inventoryPendingToSave() {
    console.log('pending to save');
    const { chemical } = this.state;
    const { parent } = this.props;
    parent.setState({ inventoryPendingToSave: true });
    console.log(parent);
    // this.setState({ anti: !this.state.anti });
    // console.log(this.state.anti); 
  };

  renderSafetyPhrases = () => {
    const { chemical, safetyPhrases } = this.state;
    let fetchedSafetyPhrases;
    if (chemical && chemical._chemical_data !== undefined && chemical._chemical_data.length !== 0) {
      const phrases = chemical._chemical_data[0].safetyPhrases;
      fetchedSafetyPhrases = (phrases !== undefined) ? this.stylePhrases(phrases) : '';
    }
    return (
      <div style={{ width: '100%', paddingTop: '10px' }}>
        {safetyPhrases === '' ? fetchedSafetyPhrases : safetyPhrases}
      </div>
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

  handlePropertiesModal(vendor) {
    this.setState({
      viewChemicalPropertiesModal: true,
      viewModalForVendor: vendor
    });
  };

  closePropertiesModal() {
    this.setState({
      viewChemicalPropertiesModal: false,
      viewModalForVendor: ''
    });
  }

  renderPropertiesModal() {
    const { viewChemicalPropertiesModal, chemical, viewModalForVendor } = this.state;
    const textAreaStyle = {
      width: '500px',
      height: '640px',
      margin: '30px',
      whiteSpace: 'pre-line',
    };
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
      // let molfile = this.molfileInput.value;
      // molfile = molfile.replace(/\r?\n/g, '<br />');
      console.log('inside cas');
      return (
        <Modal
          show={viewChemicalPropertiesModal}
          onHide={() => this.closePropertiesModal()}
        >
          <Modal.Header closeButton>
            <Modal.Title>Fetched Chemical Properties</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div>
              <FormGroup controlId="propertiesModal">
                <FormControl
                  componentClass="textarea"
                  style={textAreaStyle}
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

  renderChemicalProperties = (vendor) => {
    const { loading, loadChemicalProperties } = this.state;

    return (
      <div>
        <InputGroup.Button>
          <OverlayTrigger placement="top" overlay={<Tooltip id="renderChemProp">Info, if any found, will be copied to properties fields in sample properties tab</Tooltip>}>
            <Button
              id="safetyPhrases-btn"
              onClick={() => this.fetchChemicalProperties(vendor)}
              disabled={!!loading || !!loadChemicalProperties}
              style={{ width: '200px' }}
            >
              {loadChemicalProperties === false ? 'fetch Chemical Properties'
                : (
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                )}
            </Button>
          </OverlayTrigger>
        </InputGroup.Button>
        <InputGroup.Button>
          <OverlayTrigger placement="top" overlay={<Tooltip id="viewChemProp">click to view fetched chemical properties</Tooltip>}>
            <Button active style={{ marginLeft: '-23px' }} onClick={() => this.handlePropertiesModal(vendor)}><i className="fa fa-file-text" /></Button>
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
        setOpenTab={() => this.setState({ openInventoryInformationTab: !openInventoryInformationTab })}
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
    return (
      <div>
        {this.inventoryCollapseBtn()}
        <Collapse in={this.state.openInventoryInformationTab}>
          <div style={{ marginTop: '15px' }}>
            <div className="drop-bottom" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: '22%' }}>
                {this.chemicalStatus(data, 'Status', 'status')}
              </div>
              <div style={{ width: '19%' }}>
                {this.textInput(data, 'Vendor', 'vendor')}
              </div>
              <div style={{ width: '19%' }}>
                {this.textInput(data, 'Order number', 'order_number')}
              </div>
              <div style={{ width: '19%' }}>
                {this.numInputWithoutTable(data, 'Amount', 'amount')}
              </div>
              <div style={{ width: '19%' }}>
                {this.textInput(data, 'Price', 'price')}
              </div>
            </div>
            <div className="drop-bottom" style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: '29%' }}>
                {this.textInput(data, 'Person', 'person')}
              </div>
              <div style={{ marginTop: '-17px', width: '40%' }}>
                <Tabs id="tab-date">
                  <Tab eventKey="required" title="Required date">
                    {this.textInput(data, 'Date', 'required_date')}
                  </Tab>
                  <Tab eventKey="ordered" title="Ordered date">
                    {this.textInput(data, 'Date', 'ordered_date')}
                  </Tab>
                </Tabs>
              </div>
              <div style={{ width: '29%' }}>
                {this.textInput(data, 'Required by', 'required_by')}
              </div>
            </div>
          </div>
        </Collapse>
      </div>
    );
  }

  locationTab(data) {
    return (
      <div>
        {this.locationCollapseBtn()}
        <Collapse in={this.state.openLocationTab}>
          <div style={{ marginTop: '15px' }}>
            <div className="drop-bottom" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: '17%' }}>
                {this.locationInput(data, 'host_building', 'host_location')}
              </div>
              <div style={{ width: '16%' }}>
                {this.locationInput(data, 'host_room', 'host_location')}
              </div>
              <div style={{ width: '18%' }}>
                {this.locationInput(data, 'host_cabinet', 'host_location')}
              </div>
              <div style={{ width: '23.5%' }}>
                {this.locationInput(data, 'host_group', 'host_group')}
              </div>
              <div style={{ width: '23.5%' }}>
                {this.locationInput(data, 'host_owner', 'host_group')}
              </div>
            </div>
            <div className="drop-bottom" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: '17%' }}>
                {this.locationInput(data, 'current_building', 'current_location')}
              </div>
              <div style={{ width: '16%' }}>
                {this.locationInput(data, 'current_room', 'current_location')}
              </div>
              <div style={{ width: '18%' }}>
                {this.locationInput(data, 'current_cabinet', 'current_location')}
              </div>
              <div style={{ width: '23.5%' }}>
                {this.locationInput(data, 'current_group', 'current_group')}
              </div>
              <div style={{ width: '23.5%' }}>
                {this.locationInput(data, 'borrowed_by', 'current_group')}
              </div>
            </div>
            <div className="drop-bottom" style={{ marginTop: '20px' }}>
              <div style={{ width: '100%' }}>
                {this.textInput(data, 'Disposal information', 'disposal_info')}
              </div>
            </div>
            <div className="drop-bottom">
              <div style={{ width: '100%' }}>
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
        savedSds = chemical._chemical_data[0].ssdPath;
        if (savedSds && savedSds.length !== 0) {
          this.setState({ displayWell: true });
        }
      }
    }
  }

  querySafetySheetButton() {
    const { loading, chemical } = this.state;
    let checkSavedSds = false;
    if (chemical && chemical._chemical_data) {
      checkSavedSds = chemical._chemical_data[0].ssdPath
        ? chemical._chemical_data[0].ssdPath.length !== 0 : false;
    }

    const button = (
      <Button
        id="submit-sds-btn"
        onClick={() => this.querySafetySheets()}
        style={{ width: 150 }}
        disabled={!!loading || checkSavedSds}
      >
        {loading === false ? 'Search for SDS'
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
      <div style={{ position: 'relative' }}>
        {button}
        {checkSavedSds && (
          <OverlayTrigger placement="top" overlay={overlay}>
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              top: 0,
              left: 0,
              zIndex: 1
            }}
            />
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
        <Collapse in={openSafetyTab}>
          <div style={{ marginTop: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: '26%' }}>
                {this.chooseVendor()}
              </div>
              <div style={{ width: '26%' }}>
                {this.queryOption()}
              </div>
              <div style={{ width: '26%' }}>
                {this.safetySheetLanguage()}
              </div>
              <div style={{ paddingTop: '25px' }}>
                {this.querySafetySheetButton()}
              </div>
            </div>
            <div>
              { displayWell ? (
                <div>
                  {this.renderSafetySheets()}
                </div>
              )
                : null}
            </div>
            { this.renderWarningMessage() }
            { this.renderSafetyPhrases() }
          </div>
        </Collapse>
      </div>
    );
  }

  render() {
    const {
      chemical
    } = this.state;
    // let cas;
    let data;

    if (chemical) {
      data = chemical._chemical_data ? chemical._chemical_data[0] : [];
      // cas = chemical ? chemical._cas : null;
    }

    const styleBorderless = { borderStyle: 'none' };

    return (
      <table className="table table-borderless">
        <tbody>
          <tr>
            <td style={styleBorderless}>
              {this.inventoryInformationTab(data)}
            </td>
          </tr>
          <tr>
            <td style={styleBorderless}>
              {this.safetyTab()}
            </td>
          </tr>
          <tr>
            <td style={styleBorderless}>
              {this.locationTab(data)}
            </td>
          </tr>
          <div>
            {this.renderPropertiesModal()}
          </div>
          {/* <tr>
            <td style={styleBorderless}>
              <div>
                {this.saveParameters()}
              </div>
            </td>
          </tr> */}
        </tbody>
      </table>
    );
  }
}

ChemicalTab.propTypes = {
  sample: PropTypes.object,
  saveInventory: PropTypes.bool.isRequired,
  pendingToSave: PropTypes.bool.isRequired
};
