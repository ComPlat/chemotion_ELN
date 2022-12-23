import React from 'react';
import {Button, FormControl} from 'react-bootstrap'
import Select from 'react-select';

import SelectFieldData from './SelectFieldData';
import SelectMapperData from './SelectMapperData';

const AdvancedSearchRow = ({ idx, selection, onChange }) => {
  const mapperOptions = SelectMapperData.fields;
  const fieldOptions = SelectFieldData.fields;
  const andOrOptions = [
    { value: "AND", label: "AND" },
    { value: "OR", label: "OR" }
  ];

  const combinationSelect = () => {
    if (selection.link != "") {
      return (
        <span className="link-select">
          <Select
            options={andOrOptions}
            value={selection.link}
            clearable={false}
            onChange={onChange(idx, 'link')} />
        </span>
      );
    } else {
      return(<span style={{flex: "0 0 127px"}} />);
    }
  }

  return (
    <>
      <div className="adv-search-row">
        {combinationSelect()}
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
        <FormControl
          type="text"
          value={selection.value}
          componentClass="textarea"
          rows={2}
          className="value-select"
          placeholder="Search value"
          onChange={onChange(idx, 'value')}
        />
      </div>
    </>
  )
}

export default AdvancedSearchRow;
