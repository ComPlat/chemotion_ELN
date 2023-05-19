import React from 'react';
import { Button, FormControl } from 'react-bootstrap'
import Select from 'react-select3';
import TreeSelect from 'antd/lib/tree-select';
import UserStore from 'src/stores/alt/stores/UserStore';

import SelectFieldData from './SelectFieldData';
import { mapperFields, unitMapperFields } from './SelectMapperData';
import { statusOptions } from 'src/components/staticDropdownOptions/options';

const AdvancedSearchRow = ({ idx, selection, onChange }) => {  
  let mapperOptions = mapperFields;
  let fieldOptions = SelectFieldData.fields[selection.table];
  let genericFields = {};

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

  if (genericEls) {
    genericEls.map((element) => {
      let layers = element.properties_template.layers;
      let elementTable = `${element.name}s`;

      genericFields[elementTable] = [];
      genericFields[elementTable].push({ value: { column: 'name', label: 'Name' }, label: 'Name' });
      genericFields[elementTable].push({ value: { column: 'short_label', label: 'Short Label' }, label: 'Short Label' })
      Object.entries(layers)
        .sort((a, b) => a.position - b.position)
        .map((value, i) => {
          let children = [];
          let label = value[1].label || 'Component';
          value[1].fields.map((val) => {
            if (val.type === 'text') {
              children.push({ label: val.label, value: { column: val.field, label: val.label } });
            }
          });
          genericFields[elementTable].push({ label: label, options: children });
        });
    });
  }

  if (selection.element_id !== 0) {
    fieldOptions = genericFields[selection.element_table];
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
              value={statusOptions.filter(({ value }) => value == selection.value)}
              isClearable={false}
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
              dropdownStyle={{ maxHeight: '250px' }}
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
                options={temperatureOptions}
                placeholder="Select unit"
                value={temperatureOptions.filter(({ value }) => value == selection.unit)}
                isClearable={false}
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
                options={durationOptions}
                placeholder="Select unit"
                value={durationOptions.filter(({ value }) => value == selection.unit)}
                isClearable={false}
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
          <span style={{ display: display, width: '100%' }}>
            <Select
              options={logicalOperators}
              value={logicalOperators.filter(({ value }) => value == selection.link)}
              isClearable={false}
              onChange={onChange(idx, 'link')}
            />
          </span>
        </span>
        <span className="match-select">
          <Select
            options={mapperOptions}
            placeholder="Select search mapper"
            value={mapperOptions.filter(({ value }) => value == selection.match)}
            isClearable={false}
            onChange={onChange(idx, 'match')} />
        </span>
        <span className="field-select">
          <Select
            options={fieldOptions}
            isClearable={false}
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
