import React from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  ButtonToolbar,
  Form,
  Modal
} from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import SVG from 'react-inlinesvg';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';


const SvgCellRenderer = ({ value })=>{
  return <SVG src={"/images/"+value} className="molecule-fixed-data" />
}

SvgCellRenderer.propTypes = {
  value: PropTypes.string,
}

const SelectCellRenderer = ({ value, onSelectChange, data, node: { rowIndex }}) => {
  return data.inchikey
    ? <Form.Check
         onChange={(e)=>onSelectChange(e.target.checked, rowIndex)}
         defaultChecked={value}
        />
    : null;
}

class CustomHeader extends React.Component {
  render(){
    const {displayName,defaultSelected,mapped_keys} = this.props

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

    this.state = {
      collection_id: null,
      rows: [],
      custom_data_keys: [],
      mapped_keys: {},
    }

    this.onSelectChange = this.onSelectChange.bind(this)
    this.onHeaderSelect = this.onHeaderSelect.bind(this)
    this.cancelImport = this.cancelImport.bind(this)
    this.onElementStoreChange = this.onElementStoreChange.bind(this)
  }

  cancelImport() {
    ElementActions.importSamplesFromFileDecline();
  }

  componentDidMount() {
    ElementStore.listen(this.onElementStoreChange);
    this.onElementStoreChange(ElementStore.getState());
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onElementStoreChange);
  }

  onElementStoreChange({ sdfUploadData }) {
    if (!sdfUploadData) {
      this.setState({ show: false });
      return;
    }

    const { collection_id, custom_data_keys, mapped_keys } = this.state;
    if (sdfUploadData.collection_id !== collection_id ||
      sdfUploadData.custom_data_keys !== custom_data_keys ||
      sdfUploadData.mapped_keys !== mapped_keys
    ) {
      const rows = sdfUploadData.data.map((e, i) => ({
        ...e,
        index: i + 1,
        checked: !!e.inchikey,
      }))

      this.setState({
        show: true,
        rows,
        collection_id: sdfUploadData.collection_id,
        custom_data_keys: sdfUploadData.custom_data_keys,
        mapped_keys: sdfUploadData.mapped_keys,
        defaultSelected: sdfUploadData.custom_data_keys.reduce((acc, key) => {
          acc[key] = '';
          return acc;
        }, {}),
      });
    }
  }

  handleClick() {
    const {
      custom_data_keys,
      collection_id,
      mapped_keys,
      rows,
      defaultSelected
    } = this.state;

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
        newRow['decoupled'] = row['MOLECULE-LESS'] || 'f'
        return newRow
      }
    })
    filtered_mapped_keys['decoupled'] = "MOLECULE-LESS"
    let params = {
      currentCollectionId: collection_id,
      rows: processRows,
      mapped_keys: filtered_mapped_keys,
    }

    ElementActions.importSamplesFromFileConfirm(params)
    this.setState({ show: false });
  }

  onSelectChange(checked, rowIndex) {
    let { rows } = this.state
    rows[rowIndex].checked = checked
    this.setState({rows: rows})
  }

  onHeaderSelect(target,customHeader){
    let {defaultSelected, custom_data_keys, mapped_keys} = this.state
    if (mapped_keys[target] && !mapped_keys[target].multiple){
      custom_data_keys.map(k =>{if (defaultSelected[k]== target){defaultSelected[k]=""} })
    }
    defaultSelected[customHeader]=target
    this.setState({defaultSelected:defaultSelected})
  }

  render() {
    let { show, rows, custom_data_keys, mapped_keys, defaultSelected } = this.state

    let columns={
          columnDefs: [
            {headerName: '#', field: 'index', width: 60, pinned: 'left'},
            {headerName: 'Structure', field: 'svg', cellRenderer: SvgCellRenderer, pinned: 'left', autoHeight: true },
            {headerName: 'name', field: 'name', editable:true},
            {
              headerName: 'Select',
              field: 'checked',
              cellRenderer: SelectCellRenderer,
              cellRendererParams: {onSelectChange: this.onSelectChange},
              width: 30,
            },
          ],
          defaultColDef: {
            editable:  false,
            filter: 'number',
            width: 300,
            resizable: true,
            sortable: true,
          },
        }

    custom_data_keys.map((e)=>{columns.columnDefs.push(
      {
        headerName: e,
        field: e ,
        headerComponent: CustomHeader,
        headerComponentParams:{
          onHeaderSelect: this.onHeaderSelect,
          defaultSelected: defaultSelected[e],
          mapped_keys: mapped_keys,
        }
      }
    )})

    return (
      <Modal show={show} centered size="xl" onHide={this.cancelImport}>
        <Modal.Header closeButton>
          <Modal.Title>Sample Import Confirmation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="ag-theme-bootstrap" style={{ height: '500px' }} >
            <AgGridReact
              columnDefs={columns.columnDefs}
              defaultColDef={columns.defaultColDef}
              rowData={rows}
              rowHeight="100"
              rowSelection="single"
              getRowStyle={(params) => {
                if (params.data.checked) { return null }
                else { return { 'backgroundColor': 'red' } }
              }}
            />
          </div>

          <ButtonToolbar className="mt-2 justify-content-end gap-1">
            <Button variant="primary" onClick={() => this.cancelImport()}>Cancel</Button>
            <Button variant="warning" onClick={() => this.handleClick()}>Import</Button>
          </ButtonToolbar>
        </Modal.Body>
      </Modal>
    )
  }
}
