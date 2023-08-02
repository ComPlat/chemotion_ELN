import React, { useContext } from 'react';
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
  const { rxnos, unitsSystem, segmentKlasses, genericEls, profile } = UserStore.getState();
  const tabs = profile.data[`layout_detail_${selection.table.slice(0, -1)}`];

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

  const addGenericFieldsByLayers = (layers, fields, segment) => {
    Object.entries(layers)
      .sort((a, b) => a[1].position - b[1].position)
      .map((value) => {
        // console.log(value);
        let label = value[1].label || '';
        let values = value[1].fields.filter((f) => { return validFieldTypes.includes(f.type) });
        let mappedValues = [];
        if (values.length >= 1) {
          values.map((v) => {
            if (segment.id != undefined && v.table == undefined) {
              Object.assign(v, { table: 'segments', element_id: segment.id });
            }
            if (v.key == undefined) {
              Object.assign(v, { key: value[1].key });
            }
            mappedValues.push(v);
          });
          fields.push({ label: label, value: mappedValues });
        }
      });
  }

  let genericFields = [];
  let genericSelectOptions = [];
  let validFieldTypes = ['text', 'select', 'checkbox', 'system-defined', 'textarea', 'input-group', 'formula-field'];

  if (genericEls) {
    let currentGenericElement = genericEls.find((e) => { return e.name === selection.element_table.slice(0, -1) });
    if (currentGenericElement) {
      let layers = currentGenericElement.properties_template.layers;
      let options = currentGenericElement.properties_template.select_options;
      if (options) {
        Object.assign(genericSelectOptions, options);
      }

      fieldOptions.map((o) => { genericFields.push(o) });
      addGenericFieldsByLayers(layers, genericFields, {});
    }
  }

  let segmentFields = [];
  let segmentSelectOptions = [];

  if (segmentKlasses && tabs) {
    let segmentsByElement = [];

    Object.entries(tabs)
      .filter((value) => { return value[1] > 0 })
      .sort((a, b) => a[1] - b[1])
      .map((value) => {
        segmentKlasses.filter((s) => { 
          if (s.element_klass.name == selection.table.slice(0, -1) && s.label == value[0]) {
            segmentsByElement.push(s);
          }
        });
      });

    if (segmentsByElement) {
      segmentsByElement.map((segment) => {
        let layers = segment.properties_template.layers;
        let options = segment.properties_template.select_options;
        if (options) {
          Object.assign(segmentSelectOptions, options);
        }
        if (layers) {
          let segments = [];
          addGenericFieldsByLayers(layers, segments, segment);
          segmentFields.push({ label: segment.label, value: segments });
        }
      });
    }
  }

  //console.log(genericFields, segmentFields);

  const textInput = (option, type, selectedValue, column, keyLabel) => {
    return (
      <FormGroup key={`${column}-${keyLabel}-${type}`}>
        <ControlLabel>{option.label}</ControlLabel>
        <FormControl
          id={`input_${column}`}
          type="text"
          key={`${column}-${keyLabel}`}
          value={selectedValue ? selectedValue[column].value : ''}
          onChange={handleFieldChanged(option, column, type)}
        />
      </FormGroup>
    );
  }

  const checkboxInput = (option, type, selectedValue, column, keyLabel) => {
    return (
      <Checkbox
        key={`${column}-${keyLabel}`}
        checked={selectedValue ? selectedValue[column].value : false}
        onChange={handleFieldChanged(option, column, type)}
      >
        {option.label}
      </Checkbox>
    );
  }

  const optionsForSelect = (option) => {
    let options = [];
    let genericOptions = [];
    let genericSelections = [];

    if (option.field !== undefined) {
      genericOptions = genericFields.length >= 1 ? genericFields : segmentFields;
      genericSelections = Object.keys(genericSelectOptions).length >= 1 ? genericSelectOptions : segmentSelectOptions;
    }

    if (option.type == 'system-defined') {
      let systemOptions = unitsSystem.fields.find((u) => { return u.field === option.option_layers });
      options = systemOptions.units;
      if (option.column && option.column == 'duration') {
        options = FieldOptions.durationOptions;
      }
    } else if (genericOptions.length >= 1) {
      Object.values(genericSelections[option.option_layers].options).forEach((option) => {
        option.value = option.label;
        options.push(option);
      });
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
          onChange={handleFieldChanged(option, columnName, type)}
          value={selectedValue ? options.filter((f) => { return f.value == selectedValue[columnName].value }) : ''}
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
          onChange={handleFieldChanged(option, option.column, type)}
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
            onChange={handleFieldChanged(option, column, type)}
          />
          <InputGroup.Addon>{option.addon}</InputGroup.Addon>
        </InputGroup>
      </FormGroup>
    );
  }

  const ButtonOrAddOn = (units, value, column) => {
    if (units.length > 1) {
      return (
        <InputGroup.Button>
          <Button key={units} bsStyle="success"
            dangerouslySetInnerHTML={{ __html: value }}
            onClick={changeUnit(units, value, column)} />
        </InputGroup.Button>
      );
    } else {
      return (
        <InputGroup.Addon dangerouslySetInnerHTML={{ __html: value }} />
      );
    }
  }

  const systemDefinedInput = (option, type, selectedValue, column, keyLabel) => {
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
            onChange={handleFieldChanged(option, column, type)}
          />
          {ButtonOrAddOn(units, value, column)}
        </InputGroup>
      </FormGroup>
    );
  }

  const inputGroupInput = (option, type, column, keyLabel) => {
    let subFields = [];
    option.sub_fields.map((field) => {
      if (field.type == 'label') {
        subFields.push(<span key={field.id} className="form-control g_input_group_label">{field.value}</span>);
      }
      if (field.type == 'text') {
        subFields.push(<FormControl className="g_input_group" key={field.id} type={field.type} name={field.id} value={field.value} onChange={handleSubFieldChanged(field.id, option, column, type)} />);
      }
      //console.log(option.label, field);
    });

    return (
      <FormGroup key={`${column}-${keyLabel}-${type}`}>
        <ControlLabel>{option.label}</ControlLabel>
        <InputGroup style={{ display: 'flex' }}>
          {subFields}
        </InputGroup>
      </FormGroup>
    );
  }

  const componentHeadline = (label, i, className) => {
    return (
      <div className={className} key={`${label}-${i}`}>{label}</div>
    );
  }

  const valueByType = (type, e) => {
    switch (type) {
      case 'text':
      case 'textarea':
      case 'textWithAddOn':
      case 'system-defined':
      case 'formula-field':
        return e.target.value;
      case 'checkbox':
        return e.target.checked;
      case 'select':
        return e.value ? e.value : e.label;
      default:
        return e;
    }
  }

  const matchByField = (field, type) => {
    switch (field) {
      case 'boiling_point':
      case 'melting_point':
        return '@>';
      case 'density':
      case 'molarity_value':
      case 'target_amount_value':
      case 'temperature':
      case 'duration':
      case 'purity':
        return '>=';
      default:
        return type == 'system-defined' ? '>=' : 'LIKE';
    }
  }

  const searchValueByStoreOrDefaultValue = (column) => {
    let index = searchStore.detailSearchValues.findIndex((f) => { return Object.keys(f).indexOf(column) != -1; });
    return (index !== -1 ? { ...searchStore.detailSearchValues[index][column] } : defaultDetailSearchValues[0]);
  }

  const handleSubFieldChanged = (id, option, column, type) => (e) => {
    option.sub_fields.map((field) => {
      if (field.id == id) {
        field.value = e.target.value;
      }
    });
    setSearchStoreValues(e.target.value, option, column, type);
  }

  const handleFieldChanged = (option, column, type) => (e) => {
    let value = valueByType(type, e);
    setSearchStoreValues(value, option, column, type);
  }

  const setSearchStoreValues = (value, option, column, type) => {
    let searchValue = searchValueByStoreOrDefaultValue(column);
    searchValue.field = option;
    searchValue.value = value;
    searchValue.match = matchByField(column, type);
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

  const changeUnit = (units, value, column) => (e) => {
    let activeUnitIndex = units.findIndex((f) => { return f.label === value })
    let nextUnitIndex = activeUnitIndex === units.length - 1 ? 0 : activeUnitIndex + 1;

    let searchValue = searchValueByStoreOrDefaultValue(column);
    searchValue.unit = units[nextUnitIndex].label;
    searchStore.addDetailSearchValue(column, searchValue);
  }

  const fieldsByType = (option, fields, keyLabel) => {
    let column = option.column === 'stereo' ? `${option.column}_${option.opt}` : (option.column || option.field);
    let genericOptions = genericFields.length >= 1 ? genericFields : segmentFields;
    column = genericOptions && option.key !== undefined ? `${column}_${option.key}` : column;
    const selectedValue = searchStore.detailSearchValues.find((f) => { return Object.keys(f).indexOf(column) != -1 });
    switch (option.type) {
      case 'text':
      case 'textarea':
      case 'formula-field':
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
      case 'input-group':
        fields.push(inputGroupInput(option, 'input-group', column, keyLabel));
        break;
    }
    return fields;
  }

  const mapOptions = (options, fields) => {
    options.map((field, i) => {
      if (Array.isArray(field.value)) {
        if (field.label) {
          fields.push(componentHeadline(field.label, i, 'detail-search-headline'));
        } else if (i != 0) {
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

  const FormElements = () => {
    let fields = [];
    let options = genericFields.length >= 1 ? genericFields : fieldOptions;
    fields = mapOptions(options, fields);

    if (segmentFields.length >= 1) {
      segmentFields.map((segment, i) => {
        fields.push(componentHeadline(segment.label, i, 'detail-search-segment-headline'));
        fields = mapOptions(segment.value, fields);
      });
    }
    return fields;
  }

  return (
    <div className='detail-search'>
      {FormElements()}
    </div>
  );
}
export default observer(DetailSearch);
