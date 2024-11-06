import React, { useContext } from 'react';
import { Form } from 'react-bootstrap'
import { Select } from 'src/components/common/Select';
import { StoreContext } from 'src/stores/mobx/RootStore';

import PublicationFieldData from './PublicationFieldData';
import { mapperFields } from './SelectMapperData';
import { CitationTypeMap } from 'src/apps/mydb/elements/details/literature/CitationType';


const PublicationSearchRow = ({ idx }) => {
  const searchStore = useContext(StoreContext).search;
  let selection = searchStore.publicationSearchValues[idx];
  let mapperOptions = mapperFields;
  let fieldOptions = PublicationFieldData.references;
  let linkSelectSpacer = selection.link == '' ? '' : 'visible';

  const logicalOperators = [
    { value: "AND", label: "AND" },
    { value: "OR", label: "OR" }
  ];

  let citationOptions = [];
  Object.entries(CitationTypeMap).forEach(([key, value]) => {
    if (key == 'uncategorized') { return; }
    citationOptions.push({ value: key, label: value.short, def: value.def });
  });

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

  const onChange = (formElement) => (e) => {
    let searchValues = { ...searchStore.publicationSearchValues[idx] };

    if (e === undefined) {
      searchValues[formElement] = '';
      searchStore.addPublicationSearchValue(idx, searchValues);
      return;
    }

    let value = formElementValue(formElement, e, e.currentTarget);
    searchValues[formElement] = value;
    searchStore.addPublicationSearchValue(idx, searchValues);
  }

  const defaultValueField = (
    <Form.Control
      type="text"
      value={selection.value}
      as="textarea"
      rows={1}
      className="value-select"
      placeholder="Search value"
      onChange={onChange('value')}
    />
  );

  const valueField = () => {
    if (selection.field == '' || selection.field.column != 'litype') {
      return defaultValueField;
    }

    return (
      <div className="value-field-select">
        <Select
          options={citationOptions}
          placeholder="Select citation"
          value={citationOptions.filter(({ value }) => value == selection.value)}
          isClearable={false}
          onChange={onChange('value')}
        />
      </div>
    );
  }

  return (
    <div className="advanced-search-row">
      <div className="link-select">
        <div className={`link-select-spacer ${linkSelectSpacer}`}>
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
          value={selection.field}
          className="field-select-options"
          onChange={onChange('field')} />
      </div>
      {valueField()}
    </div>
  )
}

export default PublicationSearchRow;
