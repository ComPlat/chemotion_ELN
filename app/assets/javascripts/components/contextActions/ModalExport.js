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
        {value: "description", text: "description", checked: true},
        {value: "cano_smiles", text: "canonical smiles", checked: true},
        {value: "sum_formular", text: "sum formula", checked: true},
        {value: "inchistring", text: "inchistring", checked: true},
        {value: "target_amount_value,target_amount_unit", text: "target amount", checked: false},
        {value: "created_at", text: "created at", checked: false},
        {value: "updated_at", text: "updated at", checked: false},
        {value: "molfile", text: "molfile", checked: false},
        {value: "purity", text: "purity", checked: false},
        {value: "solvent", text: "solvent", checked: false},
        {value: "impurities", text: "impurities", checked: false},
        {value: "location", text: "location", checked: false},
        {value: "is_top_secret", text: "is top secret?", checked: false},
        {value: "ancestry", text: "ancestry", checked: false},
        {value: "external_label", text: "external label", checked: false},
        {value: "short_label", text: "short label", checked: false},
        {value: "real_amount_value,real_amount_unit", text: "real amount", checked: false},
        {value: "imported_readout", text: "imported readout", checked: false},
        {value: "identifier", text: "identifier", checked: false},
        {value: "density", text: "density", checked: false},
        {value: "melting_point", text: "melting point", checked: false},
        {value: "boiling_point", text: "boiling point", checked: false},
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
    return this.chainedItems(columns);
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

const exportSelections = (uiState, userState, removedColumns, e) => {
  const { currentCollection, sample, reaction, wellplate } = uiState;
  const { currentType } = userState;
  const { checkedIds, uncheckedIds, checkedAll } = sample
  ReportsFetcher.createDownloadFile({
    type: currentType,
    exportType: e,
    checkedIds: checkedIds.toArray(),
    uncheckedIds: uncheckedIds.toArray(),
    checkedAll: checkedAll,
    currentCollection: currentCollection.id,
    removedColumns: removedColumns
  });
}



const selectedStringfy = (input, currentCollection, removedColumns, e) => {
  const { checkedIds, uncheckedIds, checkedAll } = input;
  return "&exportType=" + e +
         "&checkedIds=" + checkedIds.toArray() +
         "&uncheckedIds=" + uncheckedIds.toArray() +
         "&checkedAll=" + checkedAll +
         "&currentCollection=" + currentCollection.id +
         "&removedColumns=" + removedColumns
}
