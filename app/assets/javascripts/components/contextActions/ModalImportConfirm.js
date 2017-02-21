import React from 'react'
import {Button, ButtonToolbar, FormGroup,FormControl,Checkbox} from 'react-bootstrap'
import UIStore from '../stores/UIStore'
import {AgGridReact} from 'ag-grid-react'
import SVG from 'react-inlinesvg'
import ElementActions from '../actions/ElementActions'


const MyCell = ({col,data,rowIndex, ...props})=>{
  return <Cell width={300}>{data[rowIndex][col]}</Cell>

}
const SvgCellRenderer = ({ value, ...props})=>{
  return <SVG src={"/images/molecules/"+value} className="molecule-fixed-data" />
}

SvgCellRenderer.propTypes = {
  value: React.PropTypes.string,
}

const SelectCellRenderer = ({ value, onSelectChange, rowIndex,...props})=>{
 return props.data.inchikey ?
    <FormGroup>
      <Checkbox
       onChange={(e)=>onSelectChange(e.target.checked,rowIndex)}
       defaultChecked={value}
        />
    </FormGroup>
  : null

}


class SelectCellEditor extends React.Component {
  constructor(props) {
    super()
    const value = props.value
    this.state = {
      value: value,
    }
  }

  getValue() {
    return this.state.value;
  }

  afterGuiAttached() {
    let {node,api,onSelectChange} = this.props
    let newVal = !this.state.value
    let rowIndex = node ? node.rowIndex : null

    if (rowIndex != null && rowIndex >= 0) {
      onSelectChange(newVal,rowIndex)
      api.setFocusedCell(rowIndex+1, "checked")
    } else {api.setFocusedCell(0, "checked")}
  }

  inputField(){
    let eGC = this.props.eGridCell
    return eGC ? eGC.getElementsByTagName("INPUT")[0] : null
  }

  render() {
    return <input type="text" value={this.state.scaled_value}
      onChange={e=>this.onChangeListener(e)}
    />
  }

}

export default class ModalImportConfirm extends React.Component {
  constructor(props) {
    super(props);
    let rows = []
    props.data.map(
      (e,i)=> {
        rows.push({
          index: i+1,
          checked: !!e.inchikey,
          ...e
        })
      })
    this.state = {
      rows:rows
    };
    this.onSelectChange = this.onSelectChange.bind(this)
  }

  componentDidMount(){
  }


  handleClick() {
    const {onHide, action} = this.props

    let ui_state = UIStore.getState();
    let params = {
      currentCollectionId: ui_state.currentCollection.id,
      rows: this.state.rows.map(e=>{if (e.checked){return e}}),
    }
    ElementActions.importSamplesFromFileConfirm(params)
    onHide();

  }

  onSelectChange(checked, rowIndex){
    let {rows} = this.state
    rows[rowIndex].checked = checked
    this.setState({rows: rows})
  }

  isDisabled() {
    false
  }

  render() {
    let {rows} = this.state

    let columns={
          columnDefs: [
            {headerName: '#', field: 'index', width: 60},
            {headerName: 'Structure', field: 'svg', cellRendererFramework: SvgCellRenderer },
            {headerName: 'name', field: 'name', editable:true},
            {headerName: 'Select', field: 'checked', cellRendererFramework: SelectCellRenderer,
              cellRendererParams:{onSelectChange: this.onSelectChange}, width: 30,
              editable:true, cellEditorFramework: SelectCellEditor,
              cellEditorParams:{onSelectChange: this.onSelectChange}
            },
          ],
          defaultColDef: {
            editable:  false,
            filter: 'number',
            width: 150,
          },
        }

    const {onHide} = this.props;

    return (
      <div style={{width:'80%',height:'80%', margin:'auto'}}>

        <div className="ag-bootstrap" style={{height: '500px'}} >
          <AgGridReact
            columnDefs={columns.columnDefs}
            defaultColDef={columns.defaultColDef}
            rowData={rows}
            enableSorting="true"
            enableFilter="true"
            rowHeight="100"
            rowSelection="single"
            getRowStyle={(params)=>{if (params.data.checked) {return null}
             else {return {'background-color': 'red'}}}}
          />
        </div>

        &nbsp;

        <ButtonToolbar>
          <Button bsStyle="primary" onClick={() => onHide()}>Cancel</Button>
          <Button bsStyle="warning" onClick={() => this.handleClick()} disabled={this.isDisabled()}>Import</Button>
        </ButtonToolbar>
      </div>
    )
  }
}
