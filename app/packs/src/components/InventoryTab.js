/* eslint-disable object-shorthand, no-trailing-spaces, 
object-property-newline, semi, react/no-unused-prop-types, react/prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel, FormControl, Button, OverlayTrigger, Tooltip, Well, ButtonToolbar, ListGroup, ListGroupItem } from 'react-bootstrap';
import Select from 'react-select';
import SVG from 'react-inlinesvg';
import InventoryFetcher from './fetchers/InventoryFetcher';

export default class InventoryTab extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      inventory: undefined,
      safetySheets: [],
      checkSaveIconThermofischer: true,
      checkSaveIconMerck: true,
      vendorValue: 'All',
      vendorSafetyPhrasesValue: '',
      vendorChemPropertiesValue: '',
      queryOption: 'Common Name',
      languageOfSdd: 'en',
      safetyPhrases: ''
    };
    this.handleFieldChanged = this.handleFieldChanged.bind(this);
  }

  componentDidMount() {
    const { element } = this.props;
    this.fetchInventory(element);
  }

  fetchInventory(element) {
    if (element === undefined || element.is_new) {
      return;
    }
    InventoryFetcher.fetchByInventoriableId(element.id, element.type).then((inventory) => {
      if (inventory !== null) {
        this.setState({ inventory: inventory });
      } 
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  handleFieldChanged(parameter, value) {
    const { inventory } = this.state;
    if (inventory) {
      inventory.invenParameters(parameter, value);
    }
    this.setState({ inventory });
  }

  handleSubmitSave() {
    const { inventory } = this.state;
    const { element } = this.props;
    if (!element || !inventory) {
      return;
    }
    const inventoryParameters = inventory._inventory_parameters;
    const params = { 
      inventory_parameters: inventoryParameters,
      inventoriable_id: element.id, 
      inventoriable_type: element.type 
    };
    if (inventory.isNew) {
      InventoryFetcher.create(params).then((newinventory) => {
        if (newinventory) {
          this.setState({ inventory });
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
      inventory.isNew = false;
    } else {
      InventoryFetcher.update(params).then((newinventory) => {
        if (newinventory) {
          this.setState({ inventory });
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    }
  }

  querySds = () => {
    const { element } = this.props;
    const sampleName = element.showedName();
    const moleculeId = element.molecule_name_hash ? element.molecule_name_hash.mid : null;
    const { inventory, vendorValue, queryOption, languageOfSdd } = this.state;
    if(inventory) {
      inventory.invenParameters('sample_name', sampleName);
      inventory.invenParameters('molecule_id', moleculeId);
    }

    const queryParams = { 
      id: moleculeId, vendor: vendorValue, queryOption: queryOption, language: languageOfSdd 
    };
    const { safetySheets } = this.state;

    InventoryFetcher.fetchSds(queryParams).then((result) => {
      const obj = JSON.parse(result);
      safetySheets.splice(0, 1);
      this.setState({ safetySheets });
      this.setState({ safetySheets: Object.values(obj) });
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  stylePhrases = (str) => {

    let HazardPhrases = [];
    for (const [key, value] of Object.entries(str['h_statements'])) {
      const st = <p>{key}: {value}</p> 
      HazardPhrases.push(st);
    }

    let precautionaryPhrases = [];
    for (const [key, value] of Object.entries(str['p_statements'])) {
      const st = <p>{key}: {value}</p> 
      precautionaryPhrases.push(st);
    }

   const style= {fontSize: '1.2em', fontWeight: 'bold', marginBottom:'0px', marginTop:'15px', marginBottom:'15px'};

   const pictogramsArray = str['pictograms'].map(i => i !== null ? 
    <SVG key={`ghs${i}`} src={`/images/ghs/${i}.svg`} /> : null);

    return (
      <div>
        <p style={style}>Pictograms: </p> 
         {(str['pictograms'] !== undefined || str['pictograms'].length !== 0) ? pictogramsArray : <p>Could not find pictograms</p>}
        <p style={style}>Hazard Statements: </p> 
         {HazardPhrases}
        <p style={style}>Precautionary Statements: </p> 
         {precautionaryPhrases}
      </div>
    );
  }

  fetchSafetyPhrases = (vendor) => {
    const { element } = this.props;
    const queryParams = { 
      vendor: vendor, id: element.id
    };
    InventoryFetcher.safetyPhrases(queryParams).then((result) => {
      if(result === 'Could not find H and P phrases' || result === 'Please fetch and save corresponding safety data sheet first') {
        const handleError = <p>{result}</p>; 
        this.setState({ safetyPhrases: handleError  })
      } else {
        this.setState({ safetyPhrases:  this.stylePhrases(result) })
        this.handleFieldChanged('safetyPhrases', result);
      }
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  fetchChemicalProperties = (vendor) => {
    const { inventory } = this.state;
    let productLink;
    console.log(inventory._inventory_parameters[0]);

    if (vendor == 'thermofischer') {
      productLink = inventory._inventory_parameters[0].alfaProductInfo.productLink;
    } else if (vendor == 'merck') {
      productLink = inventory._inventory_parameters[0].merckProductInfo.productLink;

    }
    console.log(productLink);

    InventoryFetcher.chemicalProperties(productLink).then((result) => {
      if(result === 'Could not find additional chemical properties') {
        const handleError = <p>{result}</p>; 
      } else {
        Object.entries(result).forEach(([key, value]) => {
          this.handleFieldChanged(key, value)
        });
        console.log(inventory._inventory_parameters[0]);
      }
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

  }

  textInput(field, label, parameter) {
    const bsSize = parameter !== 'important_notes' && parameter !== 'disposal_info' ? 'small' : null;
    const componentClass = parameter !== 'important_notes' && parameter !== 'disposal_info' && parameter !== 'sensitivity_storage' 
    && parameter !== 'solubility' ? 'input' : 'textarea';
    const noBoldLabel = { fontWeight: 'normal' } 
    return (
      <FormGroup bsSize={bsSize}>
        <ControlLabel style={noBoldLabel}>{label}</ControlLabel>
        <FormControl
          componentClass={componentClass}
          id={`txinput_${label}`}
          type="text"
          value={field}
          onChange={(e) => { this.handleFieldChanged(parameter, e.target.value); }}
          rows={label !== 'Important notes' && label !== 'Disposal information' ? 1 : 2}
        />
      </FormGroup>
    );
  }

  handleRemove(index, document) {
    const { safetySheets, inventory } = this.state;
    const parameters = inventory._inventory_parameters[0];
    if (safetySheets.length !== 0) {
      safetySheets.splice(index, 1);
      this.setState({ safetySheets });
    } else {
      if (document.alfa_link) {
        delete parameters.alfaProductInfo;
      } else if (document.merck_link) {
        delete parameters.merckProductInfo;
      }
      inventory._inventory_parameters[0].ssdPath.splice(index, 1);
      this.setState({ inventory });
      this.updateCheckMark(index, document);
    }
    this.handleSubmitSave();
  }

  updateCheckMark(index, document) { 
    if (document.alfa_link) {
      this.setState({ checkSaveIconThermofischer: true })
    } else if (document.merck_link) {
      this.setState({ checkSaveIconMerck: true })
    }
  }


  checkMarkButton(document) {
    const { checkSaveIconThermofischer, checkSaveIconMerck } = this.state;
    if (document.alfa_link) {
      return (
        (checkSaveIconThermofischer && document.alfa_product_number !== undefined) ? null : 
        <OverlayTrigger placement="top" overlay={<Tooltip id="saveCheckIconThermo">Saved</Tooltip>}>
          <i className="fa fa-check-circle" style={{ paddingLeft: '10px' }} />
        </OverlayTrigger>
      );
    } else if (document.merck_link) {
      return (
        (checkSaveIconMerck && document.merck_product_number !== undefined) ? null : 
        <OverlayTrigger placement="top" overlay={<Tooltip id="saveCheckIconMerck">Saved</Tooltip>}>
          <i className="fa fa-check-circle" style={{ paddingLeft: '10px' }} />
        </OverlayTrigger>
      );
    }
  }

  handleCheckMark(vendor) {
    if (vendor === 'Thermofischer') {
      this.setState({ checkSaveIconThermofischer: false })
    } else if (vendor === 'Merck') {
      this.setState({ checkSaveIconMerck: false })
    }
  }

  updateMark() {
    this.setState({ checkSaveIconThermofischer: false });
    this.setState({ checkSaveIconMerck: false });
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
    const { inventory } = this.state;
    let vendorProduct;
    if(productInfo.vendor === 'Thermofischer') {
      vendorProduct = 'alfaProductInfo';
    } else if(productInfo.vendor === 'Merck') {
      vendorProduct = 'merckProductInfo';
    }
    //update inventory_parameters before saving it in the database
    this.handleFieldChanged(vendorProduct, productInfo);
    const params = { 
      inventory_parameters: inventory._inventory_parameters,
      inventoriable_id: this.props.element.id,
      vendor_product: vendorProduct
    };
    InventoryFetcher.saveSds(params).then((result) => {
      if (result || result === 'file is already saved') {
        const value = `/safety_sheets/${productInfo.productNumber}_${productInfo.vendor}.pdf`;
        const inventoryParameters = inventory._inventory_parameters;
        let pathArr = [];
        const pathParams = {};
        let vendorParams;
        if (productInfo.vendor === 'Thermofischer') {
          vendorParams = 'alfa_link';
        } else {
          vendorParams = 'merck_link';
        }
        pathParams[vendorParams] = value;
        if (inventoryParameters[0].ssdPath === undefined || inventoryParameters[0].ssdPath.length === 0) {
          pathArr.push(pathParams);
          this.handleFieldChanged('ssdPath', pathArr);
        } else if (inventoryParameters[0].ssdPath.length === 1 && inventoryParameters[0].ssdPath[0][vendorParams] === undefined) {
          inventoryParameters[0].ssdPath.push(pathParams);
        } else if (inventoryParameters[0].ssdPath.length === 1 && inventoryParameters[0].ssdPath[0][vendorParams] !== undefined && inventoryParameters[0].ssdPath[0][vendorParams] !== value) {
          inventoryParameters[0].ssdPath[0][vendorParams] = value;
        } else {
          for (let i = 0; i < inventoryParameters[0].ssdPath.length; i += 1) {
            if (inventoryParameters[0].ssdPath[i][vendorParams] !== undefined && inventoryParameters[0].ssdPath[i][vendorParams] !== value) {
              inventoryParameters[0].ssdPath[i][vendorParams] = value;
            }
          }
        }
        this.setState({ inventory: inventory });
        this.handleSubmitSave();
        this.handleCheckMark(productInfo.vendor);
      }
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }


  saveSds(sdsInfo) {
    let vendor;
    let sdsLink;
    let productNumber;
    let productLink;
    let productInfo;
    const { element } = this.props;
    const { inventory } = this.state;
    if (sdsInfo.alfa_link !== undefined) {
      vendor = 'Thermofischer'
      sdsLink = sdsInfo.alfa_link;
      productNumber = sdsInfo.alfa_product_number;
      productLink = sdsInfo.alfa_product_link; 
      productInfo = {
        vendor: vendor,
        sdsLink: sdsLink,
        productNumber: productNumber,
        productLink: productLink,
      };
    } else if (sdsInfo.merck_link !== undefined) {
      vendor = 'Merck'
      sdsLink = sdsInfo.merck_link;
      productNumber = sdsInfo.merck_product_number;
      productLink = sdsInfo.merck_product_link;
      productInfo = {
        vendor: vendor,
        sdsLink: sdsLink,
        productNumber: productNumber,
        productLink: productLink,
      };
    }
    const inventoryParameters = inventory._inventory_parameters;
    const params = { 
      inventory_parameters: inventoryParameters,
      inventoriable_id: element.id, 
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

  handleVendorOption(value) {
    this.setState({ vendorValue: value })
  }

  handleVendorSafetyOption(value) {
    this.setState({ vendorSafetyPhrasesValue: value })
  }

  handleVendorChemPropOption(value) {
    this.setState({ vendorChemPropertiesValue: value })
  }

  handleQueryOption(value) {
    this.setState({ queryOption: value })
  }

  handleLanguageOption(value) {
    this.setState({ languageOfSdd: value })
  }

  chooseVendor() {
    const { vendorValue } = this.state;
    const vendorOptions = [
      { label: 'All', value: 'All' },
      { label: 'Merck', value: 'Merck' },
      { label: 'Thermofischer', value: 'Thermofischer' },
      { label: 'ChemicalSafety', value: 'ChemicalSafety' }
    ];

    return (
      <FormGroup style={{ width: '100%' }}>
        <ControlLabel style={{ paddingRight: '100px' }}>Vendor</ControlLabel>
        <Select
          name="chemicalVendor"
          clearable={false}
          options={vendorOptions}
          onChange={e => this.handleVendorOption(e.value)}
          value={vendorValue}
        />
      </FormGroup>
    );
  }

  queryOption() {
    const { queryOption, languageOfSdd } = this.state;
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
          onChange={e => this.handleQueryOption(e.value)}
          value={queryOption}
        />
      </FormGroup>
    );
  }

  languageOfSdd() {
    const { languageOfSdd } = this.state;
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
          onChange={e => this.handleLanguageOption(e.value)}
          value={languageOfSdd}
        />
      </FormGroup>
    );
  }
  
  renderSafetySheets = () => {
    const { safetySheets, inventory } = this.state;
    let sdsStatus;
    let savedSds;
    if (inventory) {
      if (inventory._inventory_parameters !== undefined) {
        savedSds = inventory._inventory_parameters[0].ssdPath;
        sdsStatus = safetySheets.length !== 0 ? safetySheets : savedSds;
      }
    }
    return (
      (sdsStatus === undefined || sdsStatus.length === 0) ? null : 
      <ListGroup>
        {sdsStatus.map((document, index) => (
          document !== 'Could not find safety data sheet' ? 
            <ListGroupItem key="safetySheetsFiles">
              <div>
                <a href={(document.alfa_link !== undefined) ? document.alfa_link : document.merck_link} target="_blank" style={{ cursor: 'pointer' }} rel="noreferrer" >
                  {(document.alfa_link !== undefined) ? 'Safety Data Sheet from Thermofischer' : 'Safety Data Sheet from Merck'}
                  { this.checkMarkButton(document) }
                </a>
                <ButtonToolbar className="pull-right">
                  {this.saveSds(document)}
                  {this.removeButton(index, document)}
                </ButtonToolbar>
              </div>
            </ListGroupItem>
          : 
            <ListGroupItem>
              <div>
                <p>
                  {(index === 0) ? 'Could not find safety data sheet from Thermofischer' : 'Could not find safety Data Sheet from Merck'}
                </p>
              </div>
            </ListGroupItem>
        ))}
      </ListGroup>
    );
  }

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
          onChange={e => this.handleVendorSafetyOption(e.value)}
          value={vendorSafetyPhrasesValue}
        />
      </FormGroup>
    );
  }

  renderSafetyPhrases = () => {
    const { inventory, vendorSafetyPhrasesValue, safetyPhrases} = this.state;
    let fetchedSafetyPhrases;
    if (inventory && inventory._inventory_parameters !== undefined) {
      const phrases = inventory._inventory_parameters[0].safetyPhrases;
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
  }

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
          onChange={e => this.handleVendorChemPropOption(e.value)}
          value={vendorChemPropertiesValue}
        />
      </FormGroup>
    );
  }

  renderChemicalProperties = () => {
    const { inventory, vendorChemPropertiesValue, safetyPhrases} = this.state;

    return (
      <table>
        <tbody>
          <tr>
            <td>
              <div style={{ width: '%100', display: 'flex', justifyContent: 'justify' }}>
                <div style={{ width: '%50', paddingRight: '20px' }}>
                  {this.chooseVendorForChemicalProperties()}
                </div> 
                <div style={{ width: '%50', paddingTop: '25px' }}>
                  <Button
                    id="safetyPhrases-btn"
                    onClick={() => this.fetchChemicalProperties(vendorChemPropertiesValue)}
                  >
                    fetch Chemical Properties
                  </Button>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            {/* <td>
              <div style={{ width: '100%', paddingTop: '10px'}}>
                {safetyPhrases === '' ? fetchedSafetyPhrases : safetyPhrases}
              </div>
            </td> */}
          </tr>
        </tbody>
      </table>
    );

  }

  render() {
    let {
      inventory
    } = this.state;
    
    let cas; 
    let internalLabel;
    let purity;
    let details;
    let vendor;
    let orderNumber;
    let person;
    let date;
    let price;
    let amount;
    let link;
    let otherInformation;
    let room;
    let building;
    let group;
    let owner;
    let sdsLink;
    let disposalInfo;
    let importantNotes;
    let form;
    let density;
    let melting_point;
    let boiling_point;
    let flash_point;
    let refractive_index;
    let solubility;
    let sensitivity_storage;


    if (inventory) {
      const inventoryParameters = inventory ? inventory._inventory_parameters : null;
      if (inventoryParameters !== undefined) {
        cas = (inventoryParameters.length !== 0) ? inventoryParameters[0].cas : '';
        internalLabel = (inventoryParameters[0].internal_label !== undefined && inventoryParameters.length !== 0) ? inventoryParameters[0].internal_label : '';
        purity = (inventoryParameters[0].purity !== undefined) ? inventoryParameters[0].purity : '';
        details = (inventoryParameters[0].details !== undefined) ? inventoryParameters[0].details : '';
        vendor = (inventoryParameters[0].vendor !== undefined) ? inventoryParameters[0].vendor : '';
        orderNumber = (inventoryParameters[0].order_number !== undefined && inventoryParameters.length !== 0) ? inventoryParameters[0].order_number : '';
        person = (inventoryParameters[0].person !== undefined) ? inventoryParameters[0].person : '';
        date = (inventoryParameters[0].date !== undefined) ? inventoryParameters[0].date : '';
        price = (inventoryParameters[0].price !== undefined) ? inventoryParameters[0].price : '';
        amount = (inventoryParameters[0].amount !== undefined) ? inventoryParameters[0].amount : '';
        link = (inventoryParameters[0].link !== undefined) ? inventoryParameters[0].link : '';
        otherInformation = (inventoryParameters[0].other_information !== undefined) ? inventoryParameters[0].other_information : '';
        room = (inventoryParameters[0].room !== undefined) ? inventoryParameters[0].room : '';
        building = (inventoryParameters[0].building !== undefined) ? inventoryParameters[0].building : '';
        group = (inventoryParameters[0].group !== undefined) ? inventoryParameters[0].group : '';
        owner = (inventoryParameters[0].owner !== undefined) ? inventoryParameters[0].owner : '';
        sdsLink = (inventoryParameters[0].sds_link !== undefined) ? inventoryParameters[0].sds_link : '';
        disposalInfo = (inventoryParameters[0].disposal_info !== undefined) ? inventoryParameters[0].disposal_info : '';
        importantNotes = (inventoryParameters[0].important_notes !== undefined) ? inventoryParameters[0].important_notes : '';
        form = (inventoryParameters[0].form !== undefined) ? inventoryParameters[0].form : '';
        density = (inventoryParameters[0].density !== undefined) ? inventoryParameters[0].density : '';
        melting_point = (inventoryParameters[0].melting_point !== undefined) ? inventoryParameters[0].melting_point : '';
        boiling_point = (inventoryParameters[0].boiling_point !== undefined) ? inventoryParameters[0].boiling_point : '';
        flash_point = (inventoryParameters[0].flash_point !== undefined) ? inventoryParameters[0].flash_point : '';
        refractive_index = (inventoryParameters[0].refractive_index !== undefined) ? inventoryParameters[0].refractive_index : '';
        solubility = (inventoryParameters[0].solubility !== undefined) ? inventoryParameters[0].solubility : '';
        sensitivity_storage = (inventoryParameters[0].sensitivity_storage !== undefined) ? inventoryParameters[0].sensitivity_storage : '';
      }
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
            <td colSpan="4" style={styleBorderless}>
              <div className="drop-bottom" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '20%' }}>
                  {this.textInput(cas, 'CAS', 'cas')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(internalLabel, 'Internal label', 'internal_label')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(purity, 'Purity', 'purity')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(details, 'Details', 'details')}
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
                  {this.textInput(form, 'Form', 'form')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(density, 'Density', 'density')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(melting_point, 'Melting Point', 'melting_point')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(boiling_point, 'Boiling Point', 'boiling_point')}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan="3" style={styleBorderless}>
              <div className="drop-bottom" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '20%' }}>
                  {this.textInput(flash_point, 'Flash Point', 'flash_point')}
                </div>
                <div style={{ width: '30%' }}>
                  {this.textInput(refractive_index, 'Refractive Index', 'refractive_index')}
                </div>
                <div style={{ width: '40%' }}>
                  {this.textInput(solubility, 'Solubility', 'solubility')}
                </div>
                {/* <div style={{ width: '20%' }}>
                {this.textInput(sensitivity_storage, 'Sensitivity and Storage', 'sensitivity_storage')}
                </div> */}
              </div>
            </td>
          </tr>
          <tr>
            <div style={{ width: '90%' }}>
             {this.textInput(sensitivity_storage, 'Sensitivity and Storage', 'sensitivity_storage')}
            </div>
          </tr>
          <tr>
            <th style={styleHeader}> History</th>
          </tr>          
          <tr>
            <td colSpan="4" style={styleBorderless}>
              <div className="drop-bottom" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '20%' }}>
                  {this.textInput(vendor, 'Vendor', 'vendor')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(orderNumber, 'Order number', 'order_number')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(person, 'Person', 'person')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(date, 'Date', 'date')}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan="4" style={styleBorderless}>
              <div className="drop-bottom" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '20%' }}>
                  {this.textInput(price, 'Price', 'price')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(amount, 'Amount', 'amount')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(link, 'Link', 'link')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(otherInformation, 'Other information', 'other_information')}
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
                  {this.textInput(room, 'Room - cabinet', 'room')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(building, 'Building', 'building')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(group, 'Group', 'group')}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(owner, 'Owner', 'owner')}
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
                  {this.textInput(sdsLink, 'Vendors saftey data sheet link', 'sds_link')}
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
                  {this.languageOfSdd()}
                </div>
                <div style={{ width: '%100', paddingTop: '25px' }}>
                  <Button
                    id="submit-sds-btn"
                    // bsStyle="warning"
                    onClick={() => this.querySds()}
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
                  {this.textInput(disposalInfo, 'Disposal information', 'disposal_info')}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan="1" style={styleBorderless}>
              <div className="drop-bottom">
                <div style={{ width: '100%' }}>
                  {this.textInput(importantNotes, 'Important notes', 'important_notes')}
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
    )
  }
}