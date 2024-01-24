import React, { useContext } from 'react';
import { FormControl } from 'react-bootstrap'
import Select from 'react-select3';
import TreeSelect from 'antd/lib/tree-select';
import UserStore from 'src/stores/alt/stores/UserStore';
import { StoreContext } from 'src/stores/mobx/RootStore';

import SelectFieldData from './SelectFieldData';
import { mapperFields, unitMapperFields } from './SelectMapperData';
import { statusOptions, temperatureOptions, durationOptions } from 'src/components/staticDropdownOptions/options';

const AdvancedSearchRow = ({ idx }) => {
  const searchStore = useContext(StoreContext).search;
  let selection = searchStore.advancedSearchValues[idx];
  let searchElement = searchStore.searchElement;
  let mapperOptions = mapperFields;
  let fieldOptions = SelectFieldData.fields[searchElement.table];
  fieldOptions = fieldOptions.filter(f => {
    return f.value.advanced === true && f.value.advanced !== undefined
  });

  const specialMatcherFields = ['temperature', 'duration'];
  if (specialMatcherFields.includes(selection.field.column)) {
    mapperOptions = unitMapperFields;
  }

  let display = selection.link == '' ? 'none' : 'table';
  let selectedFieldOption = selection.field.label == 'Name' && selection.table == 'samples' ? fieldOptions[0].value : selection.field;

  const logicalOperators = [
    { value: "AND", label: "AND" },
    { value: "OR", label: "OR" }
  ];

  const { rxnos } = UserStore.getState();

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
    let message = 'Only numbers are allowed';
    searchStore.removeErrorMessage(message);

    if (isNaN(Number(value))) {
      searchStore.addErrorMessage(message);
    }
  }

  const onChange = (formElement) => (e) => {
    let searchValues = { ...searchStore.advancedSearchValues[idx] };

    if (e === undefined) {
      searchValues[formElement] = '';
      searchStore.addAdvancedSearchValue(idx, searchValues);
      return;
    }

    let value = formElementValue(formElement, e, e.currentTarget);
    searchValues[formElement] = value;
    searchValues['table'] = searchElement.table;
    searchValues['element_id'] = searchElement.element_id

    const fieldColumn = searchValues.field.column;
    if (value.column == 'temperature') { searchValues = temperatureConditions(searchValues, value.column) }
    if (value.column == 'duration') { searchValues = durationConditions(searchValues, value.column) }
    if (specialMatcherFields.includes(fieldColumn) && formElement == 'value') { checkValueForNumber(value) }
    if (!specialMatcherFields.includes(fieldColumn) && formElement != 'unit' && !specialMatcherFields.includes(value.column)) {
      searchValues['unit'] = '';
    }
    if (!specialMatcherFields.includes(fieldColumn) && ['>', '<'].includes(searchValues['match']) && formElement != 'match') {
      searchValues['match'] = '=';
    }
    if (value.opt == 'rows' && searchValues['match'] !== 'ILIKE') { searchValues['match'] = 'ILIKE' }
    searchStore.addAdvancedSearchValue(idx, searchValues);
  }

  const filterTreeNode = (input, child) => {
    return String(child.props.search && child.props.search.toLowerCase()).indexOf(input && input.toLowerCase()) !== -1;
  };

  const defaultValueField = (
    <FormControl
      type="text"
      value={selection.value}
      componentClass="textarea"
      rows={1}
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
          <div className="value-field-select">
            <Select
              options={statusOptions}
              placeholder="Select status"
              value={statusOptions.filter(({ value }) => value == selection.value)}
              isClearable={false}
              onChange={onChange('value')}
            />
          </div>
        );
        break;
      case 'rxno':
        return (
          <div className="value-field-select">
            <TreeSelect
              value={selection.value}
              treeData={rxnos}
              allowClear
              placeholder="Select type"
              dropdownStyle={{ maxHeight: '250px', zIndex: '500000' }}
              onChange={onChange('value')}
              filterTreeNode={filterTreeNode}
            />
          </div>
        );
        break;
      case 'temperature':
        return (
          <>
            <div className="value-field-select">
              <Select
                options={temperatureOptions}
                placeholder="Select unit"
                value={temperatureOptions.filter(({ value }) => value == selection.unit)}
                isClearable={false}
                onChange={onChange('unit')}
              />
            </div>
            <div className="value-field-select">
              <FormControl
                type="text"
                value={selection.value}
                componentClass="textarea"
                rows={1}
                className="value-select-unit"
                placeholder="Search value"
                onChange={onChange('value')}
              />
            </div>
          </>
        );
        break;
      case 'duration':
        return (
          <>
            <div className="value-field-select">
              <Select
                options={durationOptions}
                placeholder="Select unit"
                value={durationOptions.filter(({ value }) => value == selection.unit)}
                isClearable={false}
                onChange={onChange('unit')}
              />
            </div>
            <div className="value-field-select">
              <FormControl
                type="text"
                value={selection.value}
                componentClass="textarea"
                rows={1}
                className="value-select-unit"
                placeholder="Search value"
                onChange={onChange('value')}
              />
            </div>
          </>
        );
        break;
      default:
        return defaultValueField;
    }
  }

  return (
    <div className="adv-search-row">
      <div className="link-select" style={{ flex: "0 0 127px" }}>
        <div style={{ display: display, width: '100%' }}>
          <Select
            options={logicalOperators}
            value={logicalOperators.filter(({ value }) => value == selection.link)}
            isClearable={false}
            onChange={onChange('link')}
          />
        </div>
      </div>
      <div className="match-select">
        <Select
          options={mapperOptions}
          placeholder="Select search mapper"
          value={mapperOptions.filter(({ value }) => value == selection.match)}
          isClearable={false}
          className="match-select-options"
          onChange={onChange('match')} />
      </div>
      <div className="field-select">
        <Select
          options={fieldOptions}
          isClearable={false}
          placeholder="Select search field"
          value={selectedFieldOption}
          className="field-select-options"
          onChange={onChange('field')} />
      </div>
      {valueField()}
    </div>
  )
}

export default AdvancedSearchRow;
