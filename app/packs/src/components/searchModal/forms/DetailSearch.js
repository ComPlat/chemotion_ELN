import React, { useState, useContext } from 'react';
import { Button, Checkbox, FormControl, FormGroup, ControlLabel } from 'react-bootstrap'
import Select from 'react-select3';
import SelectFieldData from './SelectFieldData';
import UserStore from 'src/stores/alt/stores/UserStore';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const DetailSearch = () => {
  const searchStore = useContext(StoreContext).search;
  let selection = searchStore.searchElement;
  let fieldOptions = SelectFieldData.fields[selection.table];
  const { rxnos, genericEls } = UserStore.getState();

  const defaultDetailSearchValues = [{
    link: 'AND',
    match: 'LIKE',
    table: selection.table,
    element_id: selection.element_id,
    field: {
      column: '',
      label: '',
    },
    value: '',
    unit: ''
  }];

  // let genericFields = {};

  //if (genericEls) {
  //  genericEls.map((element) => {
  //    let layers = element.properties_template.layers;
  //    let elementTable = `${element.name}s`;
  //
  //    genericFields[elementTable] = [];
  //    genericFields[elementTable].push({ value: { column: 'name', label: 'Name' }, label: 'Name' });
  //    genericFields[elementTable].push({ value: { column: 'short_label', label: 'Short Label' }, label: 'Short Label' })
  //    Object.entries(layers)
  //      .sort((a, b) => a.position - b.position)
  //      .map((value, i) => {
  //        let children = [];
  //        let label = value[1].label || 'Component';
  //        value[1].fields.map((val) => {
  //          if (val.type === 'text') {
  //            children.push({ label: val.label, value: { column: val.field, label: val.label } });
  //          }
  //        });
  //        genericFields[elementTable].push({ label: label, options: children });
  //      });
  //  });
  //}

  //if (selection.element_id !== 0) {
  //  fieldOptions = genericFields[searchStore.searchElement.element_table];
  //}

  const textInput = (field, label) => {
    // value={(/^xref_/.test(field) ? sample.xref[field.split('xref_')[1]] : sample[field]) || ''}
    let selectedValue = searchStore.detailSearchValues.find((f) => { return Object.keys(f).indexOf(field) != -1 });
    return (
      <FormGroup bsSize="small" key={field}>
        <ControlLabel>{label}</ControlLabel>
        <FormControl
          id={`input_${field}`}
          type="text"
          value={selectedValue ? selectedValue[field].value : ''}
          onChange={handleFieldChanged(field, label)}
        />
      </FormGroup>
    );
  }

  const handleFieldChanged = (field, label) => (e) => {
    //console.log(field, e.target.value);

    let searchValue = defaultDetailSearchValues[0];
    searchValue.field = { column: field, label: label };
    searchValue.value = e.target.value;
    searchStore.addDetailSearchValue(field, searchValue);
  }

  const FormElements = () => {
    let fields = [];
    fieldOptions.map((option) => {
      if (option.value.type === 'text') {
        fields.push(textInput(option.value.column, option.label));
      }
    });
    return fields;
  }

  return (
    <div className='detail-search'>
      {FormElements()}
    </div>
  );
}
export default observer(DetailSearch);
