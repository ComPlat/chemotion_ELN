/* eslint-disable object-shorthand, no-trailing-spaces, 
object-property-newline, semi, react/no-unused-prop-types, react/prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel, FormControl, Table, Button, OverlayTrigger, Tooltip, Well, ButtonToolbar, ListGroup, ListGroupItem } from 'react-bootstrap';
import InventoryFetcher from './fetchers/InventoryFetcher';
import Inventory from './models/Inventory';
import AttachmentFetcher from './fetchers/AttachmentFetcher';
import { downloadBlob } from './utils/FetcherHelper';
import { sample } from 'lodash';


// const SafetyComponent = ({ element }) => {
//   if (element.type === 'sample' && element.is_top_secret === true) {
//     const tooltip = (<Tooltip id="top_secret_icon">Top secret</Tooltip>);
//     return (
//       <OverlayTrigger placement="top" overlay={tooltip}>
//         <i className="fa fa-user-secret" />
//       </OverlayTrigger>
//     );
//   }
//   return null;
// };

// const handleFieldChanged = (parameter, value) => {
//   const { inventory } = this.state;
//   // if (inventory === undefined) {
//   //   inventory = Inventory.buildEmpty();
//   // }
//   inventory.cas(parameter, value);
//   // if (parameter === 'cas') {
//   //   inventory.cas(parameter, value);
//   //   // this.addCas(value);
//   // } else if (parameter === 'internal_label') {
//   //   inventory.cas(parameter, value);
//   // }
//   this.setState({ inventory });
// }

// const TextInput = ({ field, label, parameter }) => {
//   const bsSize = parameter !== 'important_notes' && parameter !== 'disposal_info' ? 'small' : null;
//   const componentClass = parameter !== 'important_notes' && parameter !== 'disposal_info' ? 'input' : 'textarea';
//   const noBoldLabel = { fontWeight: 'normal' } 
//   // console.log(parameter);
//   return (
//     <FormGroup bsSize={bsSize}>
//       <ControlLabel style={noBoldLabel}>{label}</ControlLabel>
//       <FormControl
//         componentClass={componentClass}
//         id={`txinput_${label}`}
//         type="text"
//         value={field}
//         onChange={(e) => { handleFieldChanged(parameter, e.target.value); }}
//         rows={label !== 'Important notes' && label !== 'Disposal information' ? 1 : 2}
//         // disabled={disabled || !sample.can_update}
//         // readOnly={disabled || !sample.can_update}
//       />
//     </FormGroup>
//   );
// }

// const RemoveButton = () => 
//   // if(!readOnly) {
//   (
//     <Button 
//       bsSize="xsmall"
//       bsStyle="danger"
//       onClick={() => console.log('removed')}
//       // disabled={disabled}
//     >
//       <i className="fa fa-trash-o" />
//     </Button>
//   );

// const RenderSafetySheets = (safetySheets) => {
//   // const { safetySheets } = this.state;
//   console.log('return again renderSafetySheets component');
//   console.log(safetySheets);
//   console.log(safetySheets[0]);
//   console.log(safetySheets.length);
//   // this.setState({ safetySheets });
  
//   return (
//     (safetySheets === undefined || safetySheets.length === 0) ? null : 
//     <ListGroup>
//       {safetySheets.safetySheets.map(document => (
//         <ListGroupItem key="safetySheetsAttachments">
//           <div>
//             <a style={{ cursor: 'pointer' }} onClick={() => console.log('adam')} >
//               Safety Data Sheet from Thermofischer
//             </a>
//             <ButtonToolbar className="pull-right">
//               <Button bsSize="xsmall" bsStyle="info" onClick={() => downloadBlob('Safety Data Sheet from Thermofischer', document)}>
//                 <i className="fa fa-download" />
//               </Button>
//               {/* {this.removeButton()} */}
//               <RemoveButton />
//             </ButtonToolbar>
//           </div>
//         </ListGroupItem>
//       ))}
//     </ListGroup>
//   );
// }

export default class InventoryTab extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      inventory: undefined,
      safetySheets: []
    };
    // this.addCas = this.addCas.bind(this);
    this.handleFieldChanged = this.handleFieldChanged.bind(this);
    // this.renderSafetySheets = this.renderSafetySheets.bind(this);
    // this.fetchsds = this.fetchsds.bind(this);

  }

  componentDidMount() {
    const { element } = this.props;
    // console.log(element.type);
    this.fetchInventory(element);
  }

  componentDidUpdate(prevProps, prevState) {
    const { safetySheets } = this.state;
    if (this.state.safetySheets !== prevState.safetySheets) {
      console.log("Component did update")
      console.log(this.state.safetySheets);
      // this.fetchsds();
      // this.setState({ safetySheets: this.state.safetySheets });
    }
  }

  // shouldComponentUpdate(nextProps, prevState) {
  //   // return true or false
  //   if (this.state.safetySheets !== prevState.safetySheets) {
  //     console.log('rerender function');
  //     return true;
  //   }
  // } 

  // fetchsds() {
  //   const { inventory } = this.state;
  //   if (inventory) {
  //     const response = InventoryFetcher.getsds(inventory.id);
  //     // .then((response) => {
  //     //   this.setState({ safetySheets: response });
  //     //   console.log(response);
  //     // });
  //     this.setState({ safetySheets: response });
  //     console.log('response');  
  //   }
  //   console.log(this.state.safetySheets);
  // }

  fetchInventory(element) {
    if (element === undefined || element.is_new) {
      return;
    }
    // console.log(typeof element.id);
    // console.log(typeof element.type);
    // console.log('typeof type');
    InventoryFetcher.fetchByInventoriableId(element.id, element.type).then((inventory) => {
      console.log(inventory);
      if (inventory !== null) {
        // console.log(inventory);
        // console.log(inventory.id);
        this.setState({ inventory: inventory });
      } 
      // else {
      //   console.log(inventory);
      //   this.setState({ inventory: inventory });
      // }
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  // handleInputChange(value) {
  //   const { inventory } = this.state;
  //   inventory.cas(value);
  //   // this.addCas(value);
  //   // if (inventory === undefined) {
  //   //   inventory = Inventory.buildEmpty();
  //   //   inventory.cas(value);
  //   //   // const inventoryParameters = inventory._inventory_parameters;
  //   //   // const object = {
  //   //   //   cas: value
  //   //   // };
  //   //   // inventoryParameters.push(object);
  //   // } else {
  //   //   inventory.cas(value);
  //   // }
  //   // note.content = value;
  //   // this.setState({ note: note });
  // }

  // eslint-disable-next-line class-methods-use-this
  // addCas(value) {
  //   const { inventory } = this.state;
  //   // let inventoryParameters = inventory.inventory_parameters;
  //   const object = {
  //     cas: value
  //   };
  //   inventory.inventory_parameters = object;
  //   this.setState({ inventory: inventory });
  //   // inventoryParameters.push(object);
  // }

  handleFieldChanged(parameter, value) {
    const { inventory } = this.state;
    // if (inventory === undefined) {
    //   inventory = Inventory.buildEmpty();
    // }
    inventory.invenParameters(parameter, value);
    // if (parameter === 'cas') {
    //   inventory.cas(parameter, value);
    //   // this.addCas(value);
    // } else if (parameter === 'internal_label') {
    //   inventory.cas(parameter, value);
    // }
    this.setState({ inventory });
  }

  handleSubmitSave() {
    console.log('it is saved');

    const { inventory } = this.state;
    const { element } = this.props;
    if (!element || !inventory) {
      return;
    }
    const inventoryParameters = inventory._inventory_parameters;
    // this.setState({isSaving: true})
    if (inventory.isNew) {
      // console.log(inventory.id);
      const params = { 
        inventory_parameters: inventoryParameters,
        inventoriable_id: element.id, 
        inventoriable_type: element.type 
      };
      InventoryFetcher.create(params).then((newinventory) => {
        console.log(newinventory);
        // console.log('create');
        if (newinventory) {
          this.setState({ inventory });
        }
        // this.setState({ inventory: newinventory });
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
      inventory.isNew = false;
      // this.setState({ inventory: inventory });
    } else {
      console.log(inventory.isNew);
      // console.log(inventory.id);
      InventoryFetcher.update(inventory).then((newinventory) => {
        console.log('update');
        console.log(newinventory);
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
    const moleculeId = element.molecule_name_hash.mid;
    console.log(moleculeId);

    const { inventory } = this.state;
    inventory.invenParameters('sample_name', sampleName);
    inventory.invenParameters('molecule_id', moleculeId);

    this.handleSubmitSave();
    InventoryFetcher.getsds(inventory.id)
      .then((result) => {
        console.log(result);
        const arr = [];
        arr.push(result);
        this.setState({ safetySheets: arr });
        console.log(this.state.safetySheets);
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  textInput(field, label, parameter) {
    const bsSize = parameter !== 'important_notes' && parameter !== 'disposal_info' ? 'small' : null;
    const componentClass = parameter !== 'important_notes' && parameter !== 'disposal_info' ? 'input' : 'textarea';
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
          // disabled={disabled || !sample.can_update}
          // readOnly={disabled || !sample.can_update}
        />
      </FormGroup>
    );
  }

  handleRemove() {
    console.log('remove element');
  }

  removeButton() {
    // if(!readOnly) {
    return (
      <Button 
        bsSize="xsmall"
        bsStyle="danger"
        onClick={() => this.handleRemove()}
        // disabled={disabled}
      >
        <i className="fa fa-trash-o" />
      </Button>
    );
    // }
  }


  saveBtn() {
    // let submitLabel = (sample && sample.isNew) ? 'Create' : 'Save';
    // const isDisabled = !sample.can_update;
    // if (closeView) submitLabel += ' and close';

    return (
      <Button
        id="submit-sample-btn"
        bsStyle="warning"
        onClick={() => this.handleSubmitSave()}
        // disabled={!this.sampleIsValid() || isDisabled}
      >
        Save
      </Button>
    );
  }

  // downloadSsd(name, document) {
  //   downloadBlob(name, document);
  // }

  // add = () => {
  //   this.setState({
  //     cart: ['ice cream'],
  //     total: 5
  //   })
  // }

  renderSafetySheets = () => {
    const { safetySheets } = this.state;
    console.log('return again renderSafetySheets component');
    // console.log(safetySheets);
    // // console.log(safetySheets[0]);
    // console.log(safetySheets.length);
    // this.setState({ safetySheets });
    
    return (
      (safetySheets === undefined || safetySheets.length === 0) ? null : 
      <ListGroup>
        {safetySheets.map(document => (
          <ListGroupItem key="safetySheetsAttachments">
            <div>
              <a style={{ cursor: 'pointer' }} onClick={() => console.log('adam')} >
                Safety Data Sheet from Thermofischer
              </a>
              <ButtonToolbar className="pull-right">
                <Button bsSize="xsmall" bsStyle="info" onClick={() => downloadBlob('Safety Data Sheet from Thermofischer', document)}>
                  <i className="fa fa-download" />
                </Button>
                {this.removeButton()}
              </ButtonToolbar>
            </div>
          </ListGroupItem>
        ))}
      </ListGroup>
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


    if (inventory) {
      // console.log(inventory);
      const inventoryParameters = inventory ? inventory._inventory_parameters : null;
      if (inventoryParameters !== undefined) {
        console.log(inventoryParameters);
        // console.log('inventoryParameters.length');
        // console.log(inventoryParameters.length);
        cas = (inventoryParameters.length !== 0) ? inventoryParameters[0].cas : '';
        internalLabel = (inventoryParameters[0].internal_label !== undefined && inventoryParameters.length !== 0) ? inventoryParameters[0].internal_label : '';
        purity = (inventoryParameters[0].purity !== undefined) ? inventoryParameters[0].purity : '';
        details = (inventoryParameters[0].details !== undefined) ? inventoryParameters[0].details : '';
        vendor = (inventoryParameters[0].vendor !== undefined) ? inventoryParameters[0].vendor : '';
        orderNumber = (inventoryParameters[0].order_number !== undefined && inventoryParameters.length !== 0) ? inventoryParameters[0].order_number : '';
        person = (inventoryParameters[0].person !== undefined) ? inventoryParameters[0].person : '';
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
      }

      // console.log(internalLabel);
    } else {  
      console.log('it is undefined');
      inventory = Inventory.buildEmpty();
    }
    // let disabled = this.props.disabled || false;
    const { element } = this.props;
    if (element && element.is_new) {
      // disabled = true;
    }
    const styleBorderless = { borderStyle: 'none' };

    const styleHeader = { paddingBottom: '10px', fontWeight: 'bold', fontSize: '17px' };

    return (
      <table className="table table-borderless">
        {/* <thead>
          <tr>
            <th style={{ paddingBottom: '10px', fontWeight: 'bold', fontSize: '17px', borderStyle: 'none' }}> Labels</th>
          </tr>
          <tr>
            <th style={{ paddingBottom: '12px', fontWeight: 'bold', fontSize: '17px', borderStyle: 'none' }}> History</th>
          </tr>
        </thead> */}
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
                  {/* <TextInput field={building} label="Building" parameter="building" /> */}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(group, 'Group', 'group')}
                  {/* <TextInput field={group} label="Group" parameter="group" /> */}
                </div>
                <div style={{ width: '20%' }}>
                  {this.textInput(owner, 'Owner', 'owner')}
                  {/* <TextInput field={owner} label="Owner" parameter="owner" /> */}

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
                  {/* <TextInput field={sdsLink} label="Vendors saftey data sheet link" parameter="sds_link" /> */}
                </div>
                <div>
                  <Button
                    id="submit-sds-btn"
                    // bsStyle="warning"
                    onClick={() => this.querySds()}
                  >
                    Query Saftey Data Sheets from Vendors
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
                  {/* <RenderSafetySheets safetySheets={this.state.safetySheets} /> */}
                </div>
              </Well>
            </div>
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
                {this.saveBtn()}
              </div>
            </td>
          </tr>
        </tbody>
      </table>     
    )
  }
}

InventoryTab.propTypes = {
  element: PropTypes.object,
  // handlePrivateNoteChanged: PropTypes.func,
};
