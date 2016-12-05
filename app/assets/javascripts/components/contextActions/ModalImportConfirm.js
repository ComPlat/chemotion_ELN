import React from 'react'
import {Button, ButtonToolbar, FormGroup,FormControl,Checkbox} from 'react-bootstrap'
import UIStore from '../stores/UIStore'
import {Table, Column, Cell} from 'fixed-data-table'
import SVG from 'react-inlinesvg'
import ElementActions from '../actions/ElementActions'


const MyCell = ({col,data,rowIndex, ...props})=>{
  return <Cell width={300}>{data[rowIndex][col]}</Cell>

}
const ImCell = ({col,data,rowIndex, ...props})=>{
  return <Cell width={300}><SVG src={"/images/molecules/"+data[rowIndex][col]} className="molecule-fixed-data" /></Cell>

}
const SelectCell = ({col,data,rowIndex, inputChange, ...props})=>{
  let ik = data[rowIndex][col]
  return ik&&ik!=="" ? <Cell width={40}>
    <FormGroup>
      <Checkbox
        onChange={(event) => inputChange( event,rowIndex)}
        defaultChecked
        />
    </FormGroup>
  </Cell>
  : null

}

export default class ModalImportConfirm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      inchikeys:this.props.data.map(e=>e.inchikey)
    };
  }

  handleClick() {
    const {onHide, action} = this.props;
    const {file} = this.state;
    let ui_state = UIStore.getState();
    let params = {
      raw_data: this.props.raw_data,
      currentCollectionId: ui_state.currentCollection.id,
      inchikeys: this.state.inchikeys,
    }
    ElementActions.importSamplesFromFileConfirm(params)
    onHide();

  }

  inputChange(event, rowIndex){
    let iks = this.state.inchikeys
    let ik = this.props.data[rowIndex].inchikey
    iks[rowIndex] = event.target.checked ? ik : null
    this.setState({inchikeys: iks})
  }

  isDisabled() {
    false
  }

  render() {
    //let rows = this.state.molecules
    let rows = [];
    this.props.data.map((e,i)=>rows.push({index: i,inchikey:e.inchikey,svg:e.svg,name:e.name}));

    const {onHide} = this.props;
    return (
      <div style={{width:'80%',height:'80%', margin:'auto'}}>
        <Table
            rowHeight={100}
            rowsCount={rows.length}
            width={710}
            height={600}
            headerHeight={50}>
            <Column
              header="#"
              cell={<MyCell col="index" data={rows}/>}
              width={50}
              center
            />
            <Column
              header="name"
              cell={<MyCell col="name" data={rows} />}
              width={300}
            />
            <Column
              header="structure"
              cell={<ImCell col="svg" data={rows} />}
              width={300}
            />
            <Column
              header="Select"
              cell={<SelectCell col="inchikey" data={rows} inputChange={(e,r)=>this.inputChange(e,r)} />}
              width={60}
            />

          </Table>
        &nbsp;

        <ButtonToolbar>
          <Button bsStyle="primary" onClick={() => onHide()}>Cancel</Button>
          <Button bsStyle="warning" onClick={() => this.handleClick()} disabled={this.isDisabled()}>Import</Button>
        </ButtonToolbar>
      </div>
    )
  }
}
