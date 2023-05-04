import React from 'react';
import { Button, FormControl } from 'react-bootstrap'
import Select from 'react-select';
import TreeSelect from 'antd/lib/tree-select';
import UserStore from 'src/stores/alt/stores/UserStore';

import SelectFieldData from './SelectFieldData';
import SelectMapperData from './SelectMapperData';
import { statusOptions } from 'src/components/staticDropdownOptions/options';

const AdvancedSearchRow = ({ idx, selection, onChange }) => {
  const mapperOptions = SelectMapperData.fields;
  const fieldOptions = SelectFieldData.fields[selection.table];
  const logicalOperators = [
    { value: "AND", label: "AND" },
    { value: "OR", label: "OR" }
  ];

  const { rxnos } = UserStore.getState();

  const filterTreeNode = (input, child) => {
    return String(child.props.search && child.props.search.toLowerCase()).indexOf(input && input.toLowerCase()) !== -1;
  };

  let display = selection.link == '' ? 'none' : 'table';

  let valueField = (
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

  if (selection.field != '' && selection.field.column == 'status') {
    valueField = (
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
  } else if (selection.field != '' && selection.field.column == 'rxno') {
    valueField = (
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
        {valueField}
      </div>
    </>
  )
}

export default AdvancedSearchRow;
