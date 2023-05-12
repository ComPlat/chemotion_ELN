import React, { useEffect } from 'react';
import { Button, FormControl } from 'react-bootstrap'
import Select from 'react-select';
import TreeSelect from 'antd/lib/tree-select';
import UserStore from 'src/stores/alt/stores/UserStore';

import SelectFieldData from './SelectFieldData';
import { mapperFields, unitMapperFields } from './SelectMapperData';
import { statusOptions } from 'src/components/staticDropdownOptions/options';

const AdvancedSearchRow = ({ idx, selection, onChange }) => {  
  let mapperOptions = mapperFields;

  if (['temperature', 'duration'].includes(selection.field.column)) {
    mapperOptions = unitMapperFields;
  }

  const fieldOptions = SelectFieldData.fields[selection.table];
  const logicalOperators = [
    { value: "AND", label: "AND" },
    { value: "OR", label: "OR" }
  ];

  const { rxnos } = UserStore.getState();
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
      onChange={onChange(idx, 'value')}
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
              value={selection.value}
              clearable={false}
              onChange={onChange(idx, 'value')}
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
              onChange={onChange(idx, 'value')}
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
                simpleValue
                options={temperatureOptions}
                placeholder="Select unit"
                value={selection.unit}
                clearable={false}
                onChange={onChange(idx, 'unit')}
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
                onChange={onChange(idx, 'value')}
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
                simpleValue
                options={durationOptions}
                placeholder="Select unit"
                value={selection.unit}
                clearable={false}
                onChange={onChange(idx, 'unit')}
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
                onChange={onChange(idx, 'value')}
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
    <>
      <div className="adv-search-row">
        <span className="link-select" style={{ flex: "0 0 127px" }}>
          <Select
            options={logicalOperators}
            value={selection.link}
            clearable={false}
            onChange={onChange(idx, 'link')}
            style={{ display: display }}
          />
        </span>
        <span className="match-select">
          <Select
            simpleValue
            options={mapperOptions}
            placeholder="Select search mapper"
            value={selection.match}
            clearable={false}
            onChange={onChange(idx, 'match')} />
        </span>
        <span className="field-select">
          <Select
            options={fieldOptions}
            clearable={false}
            placeholder="Select search field"
            value={selection.field}
            onChange={onChange(idx, 'field')} />
        </span>
        {valueField()}
      </div>
    </>
  )
}

export default AdvancedSearchRow;
