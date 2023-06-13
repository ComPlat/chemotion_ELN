import React, { useContext } from 'react';
import { FormControl } from 'react-bootstrap'
import Select from 'react-select3';
import TreeSelect from 'antd/lib/tree-select';
import UserStore from 'src/stores/alt/stores/UserStore';
import { StoreContext } from 'src/stores/mobx/RootStore';

import SelectFieldData from './SelectFieldData';
import { mapperFields, unitMapperFields } from './SelectMapperData';
import { statusOptions } from 'src/components/staticDropdownOptions/options';

const AdvancedSearchRow = ({ idx }) => {
  const searchStore = useContext(StoreContext).search;
  let selection = searchStore.advancedSearchValues[idx];
  let mapperOptions = mapperFields;
  let fieldOptions = SelectFieldData.fields[searchStore.searchElement.table];
  fieldOptions = fieldOptions.filter(f => {
    return f.value.advanced === true && f.value.advanced !== undefined
  });

  if (['temperature', 'duration'].includes(selection.field.column)) {
    mapperOptions = unitMapperFields;
  }

  const logicalOperators = [
    { value: "AND", label: "AND" },
    { value: "OR", label: "OR" }
  ];

  const { rxnos, genericEls } = UserStore.getState();
  const temperatureOptions = [
    { value: '°C', label: '°C' },
    { value: '°F', label: '°F' },
    { value: 'K', label: 'K' }
  ];
  
  const durationOptions = [
    { value: 'Hour(s)', label: 'Hour(s)' },
    { value: 'Minute(s)', label: 'Minute(s)' },
    { value: 'Second(s)', label: 'Second(s)' },
    { value: 'Week(s)', label: 'Week(s)' },
    { value: 'Day(s)', label: 'Day(s)' },
  ];

  const formElementValue = (formElement, e) => {
    switch (formElement) {
      case 'value':
        const value = typeof e.target !== 'undefined' ? e.target.value : (typeof e.value !== 'undefined' ? e.value : e);
        return value;
      case 'field':
      case 'link':
      case 'match':
      case 'unit':
        return e.value;
      default:
        return e;
    }
  }

  const temperatureConditions = (searchValues, column) => {
    if (searchValues['unit'] == '' || column == 'temperature') {
      searchValues['unit'] = '°C';
    }
    if (searchValues['match'] != '=') {
      searchValues['match'] = '=';
    }
    return searchValues;
  }

  const durationConditions = (searchValues, column) => {
    if (searchValues['unit'] == '' || column == 'duration') {
      searchValues['unit'] = 'Hour(s)';
    }
    if (searchValues['match'] != '=') {
      searchValues['match'] = '=';
    }
    return searchValues;
  }

  const checkValueForNumber = (value) => {
    searchStore.changeErrorMessage('');
    if (isNaN(Number(value))) {
      searchStore.changeErrorMessage("Only numbers are allowed");
    }
  }

  const onChange = (formElement) => (e) => {
    let value = formElementValue(formElement, e, e.currentTarget);
    let searchValues = { ...searchStore.advancedSearchValues[idx] };
    searchValues[formElement] = value;

    const fieldColumn = searchValues.field.column;
    const additionalFields = ['temperature', 'duration'];
    if (value.column == 'temperature') { searchValues = temperatureConditions(searchValues, value.column) }
    if (value.column == 'duration') { searchValues = durationConditions(searchValues, value.column) }
    if (additionalFields.includes(fieldColumn) && formElement == 'value') { checkValueForNumber(value) }
    if (!additionalFields.includes(fieldColumn) && formElement != 'unit' && !additionalFields.includes(value.column)) {
      searchValues['unit'] = '';
    }
    searchStore.addAdvancedSearchValue(idx, searchValues);
    console.log(searchStore.advancedSearchValues[idx]);
  }

  const filterTreeNode = (input, child) => {
    return String(child.props.search && child.props.search.toLowerCase()).indexOf(input && input.toLowerCase()) !== -1;
  };

  let display = selection.link == '' ? 'none' : 'table';

  const defaultValueField = (
    <FormControl
      type="text"
      value={selection.value}
      componentClass="textarea"
      rows={2}
      className="value-select"
      placeholder="Search value"
      onChange={onChange('value')}
    />
  );

  const valueField = () => {
    if (selection.field == '') { return defaultValueField }

    switch (selection.field.column) {
      case 'status':
        return (
          <span className="value-field-select">
            <Select
              options={statusOptions}
              placeholder="Select status"
              value={statusOptions.filter(({ value }) => value == selection.value)}
              isClearable={false}
              onChange={onChange('value')}
            />
          </span>
        );
        break;
      case 'rxno':
        return (
          <span className="value-field-select">
            <TreeSelect
              value={selection.value}
              treeData={rxnos}
              placeholder="Select type"
              dropdownStyle={{ maxHeight: '250px' }}
              onChange={onChange('value')}
              filterTreeNode={filterTreeNode}
            />
          </span>
        );
        break;
      case 'temperature':
        return (
          <>
            <span className="value-field-select">
              <Select
                options={temperatureOptions}
                placeholder="Select unit"
                value={temperatureOptions.filter(({ value }) => value == selection.unit)}
                isClearable={false}
                onChange={onChange('unit')}
              />
            </span>
            <span className="value-field-select">
              <FormControl
                type="text"
                value={selection.value}
                componentClass="textarea"
                rows={1}
                className="value-select-unit"
                placeholder="Search value"
                onChange={onChange('value')}
              />
            </span>
          </>
        );
        break;
      case 'duration':
        return (
          <>
            <span className="value-field-select">
              <Select
                options={durationOptions}
                placeholder="Select unit"
                value={durationOptions.filter(({ value }) => value == selection.unit)}
                isClearable={false}
                onChange={onChange('unit')}
              />
            </span>
            <span className="value-field-select">
              <FormControl
                type="text"
                value={selection.value}
                componentClass="textarea"
                rows={1}
                className="value-select-unit"
                placeholder="Search value"
                onChange={onChange('value')}
              />
            </span>
          </>
        );
        break;
      default:
        return defaultValueField;
    }
  }

  return (
    <div className="adv-search-row">
      <span className="link-select" style={{ flex: "0 0 127px" }}>
        <span style={{ display: display, width: '100%' }}>
          <Select
            options={logicalOperators}
            value={logicalOperators.filter(({ value }) => value == selection.link)}
            isClearable={false}
            onChange={onChange('link')}
          />
        </span>
      </span>
      <span className="match-select">
        <Select
          options={mapperOptions}
          placeholder="Select search mapper"
          value={mapperOptions.filter(({ value }) => value == selection.match)}
          isClearable={false}
          onChange={onChange('match')} />
      </span>
      <span className="field-select">
        <Select
          options={fieldOptions}
          isClearable={false}
          placeholder="Select search field"
          value={selection.field}
          onChange={onChange('field')} />
      </span>
      {valueField()}
    </div>
  )
}

export default AdvancedSearchRow;
