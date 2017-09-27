import React from 'react';
import {Button, ButtonToolbar, Input,
        DropdownButton, MenuItem} from 'react-bootstrap';
import CheckBoxs from '../common/CheckBoxs';
import UIStore from './../stores/UIStore';
import UserStore from './../stores/UserStore';
import ReportsFetcher from './../fetchers/ReportsFetcher';
import Utils from '../utils/Functions';

export default class ModalExport extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      columns: [
        {value: "Image", text: "image", checked: true},
        {value: "name", text: "name", checked: true},
        {value: "molecule_name", text: "molecule name", checked: true},
        {value: "cano_smiles", text: "canonical smiles", checked: true},
        {value: "inchistring", text: "InChIstring", checked: true},
        {value: "inchikey", text: "InChIkey", checked: true},
        {value: "sum_formular", text: "sum formula", checked: true},
        {value: "external_label", text: "external label", checked: false},
        {value: "short_label", text: "short label", checked: false},
        {value: "description", text: "description", checked: true},
        {value: "real_amount_value,real_amount_unit", text: "real amount", checked: false},
        {value: "target_amount_value, target_amount_unit", text: "target amount", checked: false},
        {value: "molarity_value, molarity_unit", text: "molarity", checked: false},
        {value: "density", text: "density", checked: false},
        {value: "molfile", text: "molfile", checked: false},
        {value: "purity", text: "purity", checked: false},
        {value: "solvent", text: "solvent", checked: false},
        {value: "location", text: "location", checked: false},
        {value: "is_top_secret", text: "is top secret?", checked: false},
        // {value: "ancestry", text: "ancestry", checked: false},
        {value: "imported_readout", text: "imported readout", checked: false},
        // {value: "identifier", text: "identifier", checked: false},
        {value: "melting_point", text: "melting point", checked: false},
        {value: "boiling_point", text: "boiling point", checked: false},
        {value: "created_at", text: "created at", checked: false},
        {value: "updated_at", text: "updated at", checked: false},
        {value: "molecular_weight", text: "molecular weight", checked: false},
      ],
      checkedAllColumns: true,
    };
  }

  toggleColumns(text, checked){
    const { columns } = this.state;
    this.setState({
      columns: columns.map( col => {
        if(col.text === text) {
          return Object.assign({}, col, {checked: !checked})
        }
        return col
      })
    })
  }

  toggleColumnsAll() {
    const { columns } = this.state;
    const newCheckValue = !this.state.checkedAllColumns
    this.setState({
      columns: columns.map( col => {
        return Object.assign({}, col, {checked: newCheckValue})
      }),
      checkedAllColumns: newCheckValue
    })
  }

  buttonBar() {
    const { onHide } = this.props;
    return (
      <ButtonToolbar>
        <div className="pull-right">
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={() => onHide()}>Cancel</Button>
            <DropdownButton dropup bsStyle="warning" id="md-export-dropdown"
                title="XLSX/SD Export" onSelect={(e) => this.handleClick(e)}>
              <MenuItem eventKey="1">XLSX Export</MenuItem>
              <MenuItem eventKey="2">SDF Export</MenuItem>
            </DropdownButton>
          </ButtonToolbar>
        </div>
      </ButtonToolbar>
    )
  }

  handleClick(e) {
    const uiState = UIStore.getState();
    const userState = UserStore.getState();
    const { onHide } = this.props;
    onHide();
    const removedColumns = this.removedColumns();
    exportSelections(uiState, userState, removedColumns, e);
  }

  removedColumns() {
    const { columns } = this.state;
    return this.chainedItems(columns).join().split(/\s*,\s*/);
  }

  chainedItems(items) {
    return items.map(item => {
      return !item.checked
        ? item.value
        : null
    }).filter(r => r!=null);
  }

  render() {
    return (
      <div>
        <div className='export-container'>
          <CheckBoxs  items={this.state.columns}
                      toggleCheckbox={this.toggleColumns.bind(this)}
                      toggleCheckAll={this.toggleColumnsAll.bind(this)}
                      checkedAll={this.state.checkedAllColumns} />
        </div>
        {this.buttonBar()}
      </div>
    )
  }
}

const exportSelections = (uiState, userState, columns, e) => {
  ReportsFetcher.createDownloadFile({
    exportType: e,
    uiState: filterUIState(uiState),
    columns: columns
  });
}

const filterUIState = (uiState) =>{
  const { currentCollection, sample, reaction, wellplate, isSync } = uiState;
  return {
    sample: {
      checkedIds: sample.checkedIds.toArray(),
      uncheckedIds: sample.uncheckedIds.toArray(),
      checkedAll: sample.checkedAll,
    },
    reaction: {
      checkedIds: reaction.checkedIds.toArray(),
      uncheckedIds: reaction.uncheckedIds.toArray(),
      checkedAll: reaction.checkedAll,
    },
    wellplate: {
      checkedIds: wellplate.checkedIds.toArray(),
      uncheckedIds: wellplate.uncheckedIds.toArray(),
      checkedAll: wellplate.checkedAll,
    },
    currentCollection: currentCollection.id,
    isSync: isSync,
  }
}
