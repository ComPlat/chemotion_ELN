import React, { useState, useContext } from 'react';
import { Button, Checkbox, FormControl, FormGroup, ControlLabel, InputGroup } from 'react-bootstrap'
import Select from 'react-select3';
import TreeSelect from 'antd/lib/tree-select';
import SelectFieldData from './SelectFieldData';
import UserStore from 'src/stores/alt/stores/UserStore';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import * as FieldOptions from 'src/components/staticDropdownOptions/options';

const DetailSearch = () => {
  const searchStore = useContext(StoreContext).search;
  let selection = searchStore.searchElement;
  let fieldOptions = SelectFieldData.fields[selection.table];
  const { rxnos, unitsSystem, segmentKlasses, genericEls } = UserStore.getState();
  const tabs = UserStore.getState().profile.data[`layout_detail_${selection.table.slice(0, -1)}`];

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

  let genericFields = {};
  let genericSelectOptions = [];
  let validFieldTypes = ['text', 'select', 'checkbox', 'system-defined', 'textarea'];

  if (genericEls) {
    let currentGenericElement = genericEls.find((e) => { return e.name === selection.element_table.slice(0, -1) });
    if (currentGenericElement) {
      let layers = currentGenericElement.properties_template.layers;
      genericSelectOptions = currentGenericElement.properties_template.select_options;
  
      genericFields = [];
      genericFields.push({ value: { column: 'name', label: 'Name', type: 'text' }, label: 'Name' });
      genericFields.push({ value: { column: 'short_label', label: 'Short Label', type: 'text' }, label: 'Short Label' });
      Object.entries(layers)
        .sort((a, b) => a.position - b.position)
        .map((value, i) => {
          let label = value[1].label || '';
          let values = value[1].fields.filter((f) => { return validFieldTypes.includes(f.type) });
          if (values.length >= 1) {
            values = values.map((v) => {
              return (v.key == undefined) ? Object.assign(v, { key: value[1].key }) : v;
            });
            genericFields.push({ label: label, value: values });
          }
        });
    }
  }

  const textInput = (option, type, selectedValue, column, keyLabel) => {
    // value={(/^xref_/.test(field) ? sample.xref[field.split('xref_')[1]] : sample[field]) || ''}
    return (
      <FormGroup key={`${column}-${keyLabel}-${type}`}>
        <ControlLabel>{option.label}</ControlLabel>
        <FormControl
          id={`input_${column}`}
          type="text"
          key={`${column}-${keyLabel}`}
          value={selectedValue ? selectedValue[column].value : ''}
          onChange={handleFieldChanged(option, column, type, selectedValue)}
        />
      </FormGroup>
    );
  }

  const checkboxInput = (option, type, selectedValue, column, keyLabel) => {
    return (
      <Checkbox
        key={`${column}-${keyLabel}`}
        checked={selectedValue ? selectedValue[column].value : false}
        onChange={handleFieldChanged(option, column, type, selectedValue)}
      >
        {option.label}
      </Checkbox>
    );
  }

  const optionsForSelect = (option) => {
    let options = [];
    if (option.type == 'system-defined') {
      let systemOptions = unitsSystem.fields.find((u) => { return u.field === option.option_layers });
      options = systemOptions.units;
      if (option.column && option.column == 'duration') {
        options = FieldOptions.durationOptions;
      }
    } else if (genericFields.length >= 1) {
      options = genericSelectOptions[option.option_layers].options;
    } else {
      options = FieldOptions[option.option_layers];
    }
    if (options && options[0] && options[0].value !== '' && option.type !== 'system-defined') {
      options.unshift({ label: '', value: '' });
    }
    return options;
  }

  const selectInput = (option, type, selectedValue, columnName, keyLabel) => {
    let options = optionsForSelect(option);
    return (
      <FormGroup key={`${columnName}-${keyLabel}-${type}`}>
        <ControlLabel>{option.label}</ControlLabel>
        <Select
          name={columnName}
          key={`${columnName}-${keyLabel}`}
          options={options}
          onChange={handleFieldChanged(option, columnName, type, selectedValue)}
          value={selectedValue ? options.filter(({ label }) => label == selectedValue[columnName].value) : ''}
        />
      </FormGroup>
    );
  }

  const filterTreeNode = (input, child) => {
    return String(child.props.search && child.props.search.toLowerCase()).indexOf(input && input.toLowerCase()) !== -1;
  };

  const rxnoInput = (option, type, selectedValue) => {
    let options = rxnos;
    if (options[0].value !== '') { options.unshift({ search: '', title: '', value: '', is_enabled: true }); }
    return (
      <FormGroup key={`${option.column}-${option.label}-${type}`}>
        <ControlLabel>{option.label}</ControlLabel>
        <TreeSelect
          key={option.column}
          value={selectedValue ? selectedValue[option.column].value : ''}
          treeData={options}
          placeholder="Select type"
          dropdownStyle={{ maxHeight: '250px' }}
          onChange={handleFieldChanged(option, option.column, type, selectedValue)}
          filterTreeNode={filterTreeNode}
        />
      </FormGroup>
    );
  }

  const textWithAddOnInput = (option, type, selectedValue, keyLabel) => {
    let column = option.column || option.field;
    return (
      <FormGroup key={`${column}-${keyLabel}-${type}`}>
        <ControlLabel>{option.label}</ControlLabel>
        <InputGroup>
          <FormControl
            id={`input_${column}`}
            type="text"
            key={`${column}-${keyLabel}`}
            value={selectedValue ? selectedValue[column].value : ''}
            onChange={handleFieldChanged(option, column, type, selectedValue)}
          />
          <InputGroup.Addon>{option.addon}</InputGroup.Addon>
        </InputGroup>
      </FormGroup>
    );
  }

  const ButtonOrAddOn = (option, units, value, selectedValue) => {
    if (units.length > 1) {
      return (
        <InputGroup.Button>
          <Button key={units} bsStyle="success" onClick={changeUnit(option, units, value, selectedValue)}>
            {value}
          </Button>
        </InputGroup.Button>
      );
    } else {
      return (
        <InputGroup.Addon dangerouslySetInnerHTML={{ __html: value }} />
      );
    }
  }

  const systemDefinedInput = (option, type, selectedValue, column, keyLabel) => {
    //let column = option.column || option.field;
    let units = optionsForSelect(option);
    let value = selectedValue ? selectedValue[column].unit : units[0].label;
    return (
      <FormGroup key={`${column}-${keyLabel}-${type}`}>
        <ControlLabel>{option.label}</ControlLabel>
        <InputGroup>
          <FormControl
            id={`input_${column}`}
            type="text"
            key={`${column}-${keyLabel}`}
            value={selectedValue ? selectedValue[column].value : ''}
            onChange={handleFieldChanged(option, column, type, selectedValue)}
          />
          {ButtonOrAddOn(option, units, value, selectedValue)}
        </InputGroup>
      </FormGroup>
    );
  }

  const componentHeadline = (label, i) => {
    return (
      <div className='detail-search-headline' key={`${label}-${i}`}>{label}</div>
    );
  }

  const valueByType = (type, e) => {
    switch (type) {
      case 'text':
      case 'textarea':
      case 'textWithAddOn':
      case 'system-defined':
        return e.target.value;
      case 'checkbox':
        return e.target.checked;
      case 'select':
        return e.value ? e.value : e.label;
      default:
        return e;
    }
  }

  const matchByField = (field) => {
    switch (field) {
      case 'boiling_point':
      case 'melting_point':
        return '@>';
      case 'density':
      case 'molarity_value':
      case 'target_amount_value':
      case 'temperature':
      case 'duration':
        return '>=';
      default:
        return 'LIKE';
    }
  }

  const searchValueByStoreOrDefaultValue = (column) => {
    let index = searchStore.detailSearchValues.findIndex((f) => { return Object.keys(f).indexOf(column) != -1; });
    return (index !== -1 ? { ...searchStore.detailSearchValues[index][column] } : defaultDetailSearchValues[0]);
  }

  const handleFieldChanged = (option, column, type, selectedValue) => (e) => {
    //console.log(option, column, e);
    let value = valueByType(type, e);
    let searchValue = searchValueByStoreOrDefaultValue(column);
    searchValue.field = option;
    searchValue.value = value;
    searchValue.match = matchByField(column);
    if (type == 'system-defined' && searchValue.unit === '') {
      let units = optionsForSelect(option);
      searchValue.unit = units[0].label;
    }
    if (value === '' || value === false) {
      searchStore.removeDetailSearchValue(column);
    } else {
      searchStore.addDetailSearchValue(column, searchValue);
    }
  }

  const changeUnit = (option, units, value, selectedValue) => (e) => {
    let column = option.column || option.field;
    let activeUnitIndex = units.findIndex((f) => { return f.label === value })
    let nextUnitIndex = activeUnitIndex === units.length - 1 ? 0 : activeUnitIndex + 1;

    let searchValue = searchValueByStoreOrDefaultValue(column);
    searchValue.unit = units[nextUnitIndex].label;
    searchStore.addDetailSearchValue(column, searchValue);
  }

  const fieldsByType = (option, fields, keyLabel) => {
    let column = option.column === 'stereo' ? `${option.column}_${option.opt}` : (option.column || option.field);
    column = genericFields && option.key !== undefined ? `${column}_${option.key}` : column;
    const selectedValue = searchStore.detailSearchValues.find((f) => { return Object.keys(f).indexOf(column) != -1 });
    switch (option.type) {
      case 'text':
      case 'textarea':
        fields.push(textInput(option, 'text', selectedValue, column, keyLabel));
        break;
      case 'checkbox':
        fields.push(checkboxInput(option, 'checkbox', selectedValue, column, keyLabel));
        break;
      case 'select':
        fields.push(selectInput(option, 'select', selectedValue, column, keyLabel));
        break;
      case 'textWithAddOn':
        fields.push(textWithAddOnInput(option, 'textWithAddOn', selectedValue, keyLabel));
        break;
      case 'rxnos':
        fields.push(rxnoInput(option, 'rxnos', selectedValue));
        break;
      case 'system-defined':
        fields.push(systemDefinedInput(option, 'system-defined', selectedValue, column, keyLabel));
        break;
    }
    return fields;
  }

  const FormElements = () => {
    let fields = [];
    let options = genericFields.length >= 1 ? genericFields : fieldOptions;

    options.map((field, i) => {
      if (Array.isArray(field.value)) {
        if (field.label) {
          fields.push(componentHeadline(field.label, i));
        } else {
          fields.push(<hr className='generic-spacer' key={`spacer-${i}`} />);
        }
        
        field.value.map((option) => {
          fields = fieldsByType(option, fields, field.label);
        });
      } else {
        fields = fieldsByType(field.value, fields, selection.table);
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
