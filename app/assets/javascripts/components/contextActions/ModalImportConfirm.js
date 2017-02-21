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

class CustomHeader extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
    }
  }


  render(){
    let {column,displayName,defaultSelected,mapped_keys}= this.props

    return(
        <div className="ag-header-cell-label">
          {displayName} &nbsp;
          <select onChange={event=>this.props.onHeaderSelect(event.target.value,displayName)} defaultValue={defaultSelected}>
            <option value=""               >do not import</option>
            {Object.keys(mapped_keys).map(k=>{
              return <option value={mapped_keys[k].field}>
                {mapped_keys[k].multiple ? "add to ": "use as "}{mapped_keys[k].displayName}
              </option>})
            }
          </select>
        </div>
    )
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
    let defaultSelected = {}
    props.custom_data_keys.map(e=>{defaultSelected[e]=""})
    this.state = {
      rows:rows,
      defaultSelected: defaultSelected,
    }
    this.onSelectChange = this.onSelectChange.bind(this)
    this.onHeaderSelect = this.onHeaderSelect.bind(this)
  }


  handleClick() {
    const {onHide, action, custom_data_keys} = this.props
    let mapped_keys = this.props.mapped_keys
    let ui_state = UIStore.getState();

    let {rows,defaultSelected} = this.state

    let filtered_mapped_keys = {}

    custom_data_keys.map(e=>{
      let field = defaultSelected[e]
      if (mapped_keys[field] && mapped_keys[field].multiple ){
        filtered_mapped_keys[field] = filtered_mapped_keys[field] ? filtered_mapped_keys[field] : []
        filtered_mapped_keys[field].push(e)
      } else if (field !== "") {
        filtered_mapped_keys[field] = e
      }
    })

    let processRows = rows.map(row=>{
      if (row.checked){
        let newRow = {
          inchikey: row.inchikey,
          molfile: row.molfile,
        }
        Object.keys(filtered_mapped_keys).map(e=>{
          let k=filtered_mapped_keys[e]
          newRow[e] = mapped_keys[e].multiple ? k.map(f=>{return(f+"\n"+row[f]+"\n")}).join("\n")
           : row[k]
        })
        return newRow
      }
    })

    let params = {
      currentCollectionId: ui_state.currentCollection.id,
      rows: processRows,
      mapped_keys: filtered_mapped_keys,
    }

    ElementActions.importSamplesFromFileConfirm(params)
    onHide();

  }

  onSelectChange(checked, rowIndex){
    let {rows} = this.state
    rows[rowIndex].checked = checked
    this.setState({rows: rows})
  }

  onHeaderSelect(target,customHeader){
    let {defaultSelected} = this.state
    let {custom_data_keys, mapped_keys} = this.props
    if (mapped_keys[target] && !mapped_keys[target].multiple){
      custom_data_keys.map(k =>{if (defaultSelected[k]== target){defaultSelected[k]=""} })
    }
    defaultSelected[customHeader]=target
    this.setState({defaultSelected:defaultSelected})
  }

  isDisabled() {
    false
  }

  render() {
    let {rows,defaultSelected} = this.state
    const {onHide,custom_data_keys} = this.props

    let columns={
          columnDefs: [
            {headerName: '#', field: 'index', width: 60, pinned: 'left'},
            {headerName: 'Structure', field: 'svg', cellRendererFramework: SvgCellRenderer, pinned: 'left' },
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
            width: 250,
          },
        }

    custom_data_keys.map((e)=>{columns.columnDefs.push(
      {
        headerName: e, field: e ,
        headerComponentFramework: CustomHeader,
        headerComponentParams:{
          onHeaderSelect: this.onHeaderSelect,
          defaultSelected: defaultSelected[e],
          mapped_keys: this.props.mapped_keys,
        }
      }
    )})

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
            enableColResize= {true}

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
