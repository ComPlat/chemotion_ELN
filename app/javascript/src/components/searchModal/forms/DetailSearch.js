import React, { useContext } from 'react';
import { Button, Form, InputGroup, Tabs, Tab, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { Select } from 'src/components/common/Select';
import TreeSelect from 'antd/lib/tree-select';
import SelectFieldData from './SelectFieldData';
import SampleInventoryFieldData from './SampleInventoryFieldData';
import AnalysesFieldData from './AnalysesFieldData';
import MeasurementFieldData from './MeasurementFieldData';
import { unitSystems } from 'src/components/staticDropdownOptions/units';
import { selectOptions } from 'src/apps/mydb/elements/details/sequenceBasedMacromoleculeSamples/selectOptions';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { ionic_liquids } from 'src/components/staticDropdownOptions/ionic_liquids';
import { convertTemperature } from 'src/utilities/UnitsConversion';
import * as FieldOptions from 'src/components/staticDropdownOptions/options';

const DetailSearch = () => {
  const searchStore = useContext(StoreContext).search;
  let selection = searchStore.searchElement;
  let fieldOptions = SelectFieldData.fields[selection.table];
  fieldOptions = selection.table === 'sequence_based_macromolecule_samples' ? SelectFieldData[selection.table] : fieldOptions;
  const { rxnos, chmos, unitsSystem, segmentKlasses, genericEls, dsKlasses, profile } = UserStore.getState();
  const layoutTabs = profile.data[`layout_detail_${selection.table.slice(0, -1)}`];
  const currentCollection = UIStore.getState().currentCollection;
  let tabSegment = currentCollection?.tabs_segment;
  let tabs = tabSegment && tabSegment[selection.table.slice(0, -1)] ? tabSegment[selection.table.slice(0, -1)] : layoutTabs;
  let genericFields = [];
  let genericSelectOptions = [];
  let fieldsByTab = [];
  let datasetOptions = [];
  let datasetSelectOptions = [];
  let inventoryData = SampleInventoryFieldData.chemicals;
  let analysesData = AnalysesFieldData.containers;
  let measurementData = MeasurementFieldData.measurements;
  let validFieldTypes = ['text', 'select', 'checkbox', 'system-defined', 'textarea', 'input-group', 'formula-field', 'table'];

  const defaultDetailSearchValues = [{
    link: 'AND',
    match: 'ILIKE',
    table: selection.table,
    element_id: selection.element_id,
    field: {
      column: '',
      label: '',
    },
    value: '',
    smiles: '',
    sub_values: [],
    unit: '',
    available_options: [],
    validationState: null
  }];

  const addGenericFieldsByLayers = (layers, fields, segment) => {
    Object.entries(layers)
      .sort((a, b) => a[1].position - b[1].position)
      .map((value) => {
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

  const addGenericDatasetFieldsByLayers = (layers, fields, dataset) => {
    Object.entries(layers)
      .sort((a, b) => a[1].position - b[1].position)
      .map((value) => {
        let label = value[1].label || '';
        let values = value[1].fields.filter((f) => { return validFieldTypes.includes(f.type) });
        let mappedValues = [];
        if (values.length >= 1) {
          values.map((v) => {
            if (v.key == undefined) {
              Object.assign(v, { key: value[1].key });
            }
            if (v.table === undefined) {
              Object.assign(v, { table: 'datasets', column: `datasets_${v.field}`, term_id: dataset.ols_term_id });
            }
            mappedValues.push(v);
          });

          const valueExists = fields.filter((f) => {
            return f.value.length === mappedValues.length && f.label === label && f.term_id === dataset.ols_term_id
          });

          if (valueExists.length < 1) {
            fields.push(
              {
                label: label, value: mappedValues, term_id: dataset.ols_term_id,
                cond_fields: [{ field: 'datasets_type', value: dataset.ols_term_id }],
              }
            );
          }
        }
      });
  }

  const pushSegmentToSegmentField = (segment) => {
    let layers = segment.properties_template.layers;
    let options = segment.properties_template.select_options;
    if (options) {
      Object.assign(genericSelectOptions, options);
    }
    if (layers) {
      let segments = [];
      addGenericFieldsByLayers(layers, segments, segment);
      fieldsByTab.push({ label: segment.label, value: segments });
    }
  }

  const pushDatasetsToAnalysesFields = () => {
    if (!dsKlasses) { return; }

    let analysesTab = fieldsByTab.find((tabs) => tabs.label === 'Analyses');
    const headlineExists = analysesTab.value.filter((t) => { return t.value.type === 'headline' })

    if (headlineExists.length < 1) {
      analysesTab.value.push(
        {
          value: {
            type: 'headline',
            label: 'Dataset metadata',
          },
          label: 'Dataset metadata',
        },
        {
          label: 'Datasets',
          value: {
            column: 'datasets_type',
            label: 'Dataset type',
            type: 'select',
            option_layers: 'datasets',
            table: 'datasets',
          },
        }
      );
    }

    dsKlasses.forEach((dataset) => {
      addGenericDatasetFieldsByLayers(dataset.properties_template.layers, analysesTab.value, dataset);
    });
  }

  if (dsKlasses) {
    dsKlasses.forEach((dataset) => {
      datasetOptions.push({ key: dataset.ols_term_id, label: dataset.label, value: dataset.ols_term_id });
      if (dataset.properties_template.select_options) {
        Object.entries(dataset.properties_template.select_options).map((options) => {
          datasetSelectOptions[`${options[0]}_${dataset.ols_term_id.replace(':', '_')}`] = options[1];
        });
      }
    });
    Object.assign(
      genericSelectOptions,
      {
        datasets: { options: datasetOptions },
        dataset_select: { options: datasetSelectOptions }
      }
    );
  }

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
      fieldsByTab.push({ label: 'Properties', value: genericFields });
      fieldsByTab.push(...analysesData);
    }
  }

  if (tabs) {
    Object.entries(tabs)
      .filter((value) => { return value[1] > 0 })
      .sort((a, b) => a[1] - b[1])
      .map((value) => {
        if (['properties', 'research_plan'].includes(value[0])) {
          fieldsByTab.push({ label: 'Properties', value: fieldOptions });
        }
        if (value[0] === 'analyses') {
          fieldsByTab.push(...analysesData);
          pushDatasetsToAnalysesFields();
        }
        if (value[0] === 'inventory') {
          fieldsByTab.push(...inventoryData);
        }
        if (value[0] === 'measurements') {
          fieldsByTab.push(...measurementData);
        }
        if (segmentKlasses) {
          segmentKlasses.filter((s) => {
            if (s.element_klass.name == selection.table.slice(0, -1) && s.label == value[0]) {
              pushSegmentToSegmentField(s);
            }
          });
        }
      });
  }

  const labelWithInfo = (option) => {
    let infoButton = ''
    if (option.info) {
      infoButton = (
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip id={option.column}>{option.info}</Tooltip>
          }
        >
          <i className="fa fa-info-circle search-info-button" aria-hidden="true" />
        </OverlayTrigger>
      );
    }

    return (
      <Form.Label>{option.label}{infoButton}</Form.Label>
    );
  }

  const textInput = (option, type, selectedValue, column, keyLabel) => {
    let validationState = selectedValue !== undefined ? selectedValue[column].validationState : null;
    return (
      <Form.Group key={`${column}-${keyLabel}-${type}`}>
        {labelWithInfo(option)}
        <Form.Control
          id={`input_${column}`}
          type="text"
          key={`${column}-${keyLabel}`}
          value={selectedValue ? selectedValue[column].value : ''}
          onChange={handleFieldChanged(option, column, type)}
          className={validationState}
        />
      </Form.Group>
    );
  }

  const textareaInput = (option, type, selectedValue, column, keyLabel) => {
    let validationState = selectedValue !== undefined ? selectedValue[column].validationState : null;

    return (
      <Form.Group key={`${column}-${keyLabel}-${type}`}>
        {labelWithInfo(option)}
        <Form.Control
          as="textarea"
          key={`${column}-${keyLabel}`}
          value={selectedValue ? selectedValue[column].value : ''}
          rows={3}
          onChange={handleFieldChanged(option, column, type)}
          className={validationState}
        />
      </Form.Group>
    );
  }

  const checkboxInput = (option, type, selectedValue, column, keyLabel) => {
    return (
      <Form.Check
        key={`${column}-${keyLabel}`}
        type="checkbox"
        id={`checkbox-${column}-${keyLabel}`}
        checked={selectedValue ? selectedValue[column].value : false}
        onChange={handleFieldChanged(option, column, type)}
        label={option.label}
      />
    );
  }

  const optionsForSelect = (option) => {
    let options = [];
    let genericOptions = [];
    let optionKey = '';
    let datasetOptionsByKey = [];

    if (option.field !== undefined) {
      genericOptions = genericFields.length >= 1 ? genericFields : fieldsByTab;
    }
    if (option.term_id && genericSelectOptions['dataset_select']) {
      optionKey = `${option.option_layers}_${option.term_id.replace(':', '_')}`;
      datasetOptionsByKey = genericSelectOptions['dataset_select'].options[optionKey];
    }

    if (option.type == 'system-defined') {
      let systemOptions = unitsSystem.fields.find((u) => { return u.field === option.option_layers });

      if (option.column && option.column == 'duration') {
        options = FieldOptions.durationOptions;
      } else if (option.column && option.column == 'target_amount_value') {
        options = FieldOptions.amountSearchOptions;
      } else if (option.table === 'sequence_based_macromolecule_samples') {
        options = unitSystems[option.option_layers];
      } else {
        options = systemOptions.units;
      }
    } else if (option.term_id && optionKey && datasetOptionsByKey) {
      Object.values(datasetOptionsByKey.options).forEach((selectOption) => {
        selectOption.value = selectOption.value ? selectOption.value : selectOption.label;
        options.push(selectOption);
      });
    } else if ((genericOptions.length >= 1 || option.column === 'datasets_type')
      && genericSelectOptions[option.option_layers]) {
      Object.values(genericSelectOptions[option.option_layers].options).forEach((selectOption) => {
        selectOption.value = selectOption.value ? selectOption.value : selectOption.label;
        options.push(selectOption);
      });
    } else if (option.table === 'sequence_based_macromolecule_samples') {
      options = selectOptions[option.option_layers];
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
      <Form.Group key={`${columnName}-${keyLabel}-${type}`}>
        {labelWithInfo(option)}
        <Select
          name={columnName}
          key={`${columnName}-${keyLabel}`}
          options={options}
          onChange={handleFieldChanged(option, columnName, type)}
          value={selectedValue ? options.filter((f) => { return f.value == selectedValue[columnName].value }) : ''}
        />
      </Form.Group>
    );
  }

  const solventOptions = Object.keys(ionic_liquids).reduce(
    (solvents, ionicLiquid) => solvents.concat({
      label: ionicLiquid,
      value: {
        external_label: ionicLiquid,
        smiles: ionic_liquids[ionicLiquid],
        density: 1.0
      }
    }), FieldOptions.defaultMultiSolventsSmilesOptions
  );

  const solventSelect = (option, type, selectedValue, columnName, keyLabel) => {
    let options = solventOptions;
    options.unshift({ label: '', value: '' });
    return (
      <Form.Group key={`${columnName}-${keyLabel}-${type}`}>
        {labelWithInfo(option)}
        <Select
          name={columnName}
          key={`${columnName}-${keyLabel}`}
          options={solventOptions}
          onChange={handleFieldChanged(option, columnName, type)}
          value={selectedValue ? solventOptions.filter((f) => { return f.label == selectedValue[columnName].value }) : ''}
        />
      </Form.Group>
    );
  }

  const filterTreeNode = (input, child) => {
    return String(child.props.search && child.props.search.toLowerCase()).indexOf(input && input.toLowerCase()) !== -1;
  };

  const rxnoChmosInput = (option, type, selectedValue, column) => {
    let options = type == 'chmos' ? chmos : rxnos;
    return (
      <Form.Group key={`${option.column}-${option.label}-${type}`}>
        {labelWithInfo(option)}
        <TreeSelect
          key={option.column}
          showSearch={true}
          value={selectedValue ? selectedValue[column].value : ''}
          treeData={options}
          placeholder="Select type"
          dropdownStyle={{ maxHeight: '250px', zIndex: '800000' }}
          allowClear
          onChange={handleFieldChanged(option, column, type)}
          filterTreeNode={filterTreeNode}
        />
      </Form.Group>
    );
  }

  const textWithAddOnInput = (option, type, selectedValue, keyLabel) => {
    let column = option.column || option.field;
    let validationState = selectedValue !== undefined ? selectedValue[column].validationState : null;
    return (
      <Form.Group key={`${column}-${keyLabel}-${type}`}>
        {labelWithInfo(option)}
        <InputGroup>
          <Form.Control
            id={`input_${column}`}
            type="text"
            key={`${column}-${keyLabel}`}
            value={selectedValue ? selectedValue[column].value : ''}
            onChange={handleFieldChanged(option, column, type)}
            className={validationState}
          />
          <InputGroup.Text>{option.addon}</InputGroup.Text>
        </InputGroup>
      </Form.Group>
    );
  }

  const ButtonOrAddOn = (units, value, column, option, subFieldId) => {
    if (units.length > 1) {
      return (
        <Button key={units} variant="success"
          dangerouslySetInnerHTML={{ __html: value }}
          onClick={changeUnit(units, value, column, option, subFieldId)} />
      );
    } else {
      return (
        <InputGroup.Text dangerouslySetInnerHTML={{ __html: value }} />
      );
    }
  }

  const systemDefinedInput = (option, type, selectedValue, column, keyLabel) => {
    let units = optionsForSelect(option);
    let value = selectedValue ? selectedValue[column].unit : units[0].label;
    let validationState = selectedValue !== undefined ? selectedValue[column].validationState : null;
    return (
      <Form.Group key={`${column}-${keyLabel}-${type}`}>
        {labelWithInfo(option)}
        <InputGroup>
          <Form.Control
            id={`input_${column}`}
            type="text"
            key={`${column}-${keyLabel}`}
            value={selectedValue ? selectedValue[column].value : ''}
            onChange={handleFieldChanged(option, column, type)}
            className={validationState}
          />
          {ButtonOrAddOn(units, value, column, option, '')}
        </InputGroup>
      </Form.Group>
    );
  }

  const inputGroupInput = (option, type, selectedValue, column, keyLabel) => {
    let subFields = [];
    option.sub_fields.map((field) => {
      if (field.type == 'label') {
        subFields.push(<InputGroup.Text key={field.id}>{field.value}</InputGroup.Text>);
      }
      if (field.type == 'text') {
        let subValue = selectedValue && selectedValue[column].sub_values[0][field.id] !== undefined ? selectedValue[column].sub_values[0][field.id] : '';
        subFields.push(
          <Form.Control
            className="g_input_group"
            key={field.id}
            type={field.type}
            name={field.id}
            value={subValue}
            onChange={handleSubFieldChanged(field.id, option, column, type)}
          />
        );
      }
    });

    return (
      <Form.Group key={`${column}-${keyLabel}-${type}`} className="sub-group-with-addon-2col">
        {labelWithInfo(option)}
        <InputGroup>
          {subFields}
        </InputGroup>
      </Form.Group>
    );
  }

  const tableInputFields = (option, type, selectedValue, column, keyLabel) => {
    let subFields = [];

    option.sub_fields.map((field) => {
      let condition =
        selectedValue && selectedValue[column].sub_values !== undefined
        && selectedValue[column].sub_values[0][field.id] !== undefined;
      let selectedFieldValue = condition ? selectedValue[column].sub_values[0][field.id] : '';
      let selectedUnitValue = typeof selectedFieldValue === 'object' ? selectedFieldValue.value_system : field.value_system;
      selectedFieldValue = typeof selectedFieldValue === 'object' ? selectedFieldValue.value : selectedFieldValue;
      let validationState = selectedValue !== undefined ? selectedValue[column].validationState : null;
      let units = optionsForSelect(field);
      let formElement = '';

      if (field.type == 'text') {
        formElement = (
          <Form.Control
            id={field.id}
            type="text"
            key={field.id}
            value={selectedFieldValue}
            onChange={handleTableFieldChanged(field.id, option, column, type)}
            className={validationState}
          />
        );
      }
      if (field.type == 'system-defined') {
        formElement = (
          <InputGroup>
            <Form.Control
              id={field.id}
              type="text"
              key={field.id}
              value={selectedFieldValue}
              onChange={handleTableFieldChanged(field.id, option, column, type)}
              className={validationState}
            />
            {ButtonOrAddOn(units, selectedUnitValue, column, option, field.id)}
          </InputGroup>
        );
      }
      if (formElement) {
        subFields.push(
          <Form.Group key={`${column}-${keyLabel}-${type}-${field.id}`}>
            <Form.Label>{field.col_name}</Form.Label>
            {formElement}
          </Form.Group>
        );
      }
    });
    return subFields;
  }

  const subGroupWithAddOnFields = (option, type, selectedValue, column, keyLabel) => {
    let subFields = [];

    option.sub_fields.map((field) => {
      let subValue = selectedValue && selectedValue[column].sub_values[0][field.key] !== undefined ? selectedValue[column].sub_values[0][field.key] : '';
      let validationState = selectedValue !== undefined ? selectedValue[column].validationState : null;
      subFields.push(
        <Form.Group
          key={`${column}-${keyLabel}-${field.key}`}
          className={`subfields-with-addon-left-${option.sub_fields.length}`}
        >
          <InputGroup>
            <InputGroup.Text>{field.addon}</InputGroup.Text>
            <Form.Control
              id={`input_${column}_${field.key}`}
              type="text"
              key={`${column}-${keyLabel}-${field.key}`}
              value={subValue}
              onChange={handleSubFieldChanged(field.key, option, column, type)}
              className={validationState}
            />
          </InputGroup>
        </Form.Group>
      );
    });

    return (
      <Form.Group key={`${column}-${keyLabel}-${type}`} className="sub-group-with-addon-2col">
        {labelWithInfo(option)}
        <Form.Group className="grouped-sub-fields">
          {subFields}
        </Form.Group>
      </Form.Group>
    );
  }

  const componentHeadline = (label, i, className) => {
    if (label === '') { return '' }

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
      case 'subGroupWithAddOn':
        return e.target.value;
      case 'checkbox':
        return e.target.checked;
      case 'select':
        return e.value ? e.value : e.label;
      case 'solventSelect':
        return e.label;
      default:
        return e;
    }
  }

  const matchByField = (field, type) => {
    switch (field) {
      case 'boiling_point':
      case 'melting_point':
        return '<@';
      case 'ec_numbers':
        return '@>';
      case 'density':
      case 'molarity_value':
      case 'target_amount_value':
      case 'temperature':
      case 'duration':
      case 'purity':
      case 'value_measurement':
      case 'solvent_ratio':
      case 'molecular_mass':
      case 'concentration_value':
      case 'activity_per_volume_value':
      case 'activity_per_mass_value':
      case 'acetylation_lysin_number':
      case 'sequence_length':
      case 'molecular_weight':
        return searchStore.numeric_match;
      case 'unit_measurement':
      case 'solvent_smiles':
        return '=';
      default:
        return type == 'system-defined' ? searchStore.numeric_match : 'ILIKE';
    }
  }

  const checkValueForNumber = (label, value) => {
    let validationState = null;
    let message = `${label}: Only numbers are allowed`;
    searchStore.removeErrorMessage(message);

    const regex = /^[0-9\s\-]+$/;
    let numericCheck = label.includes('point') ? !regex.test(value) : isNaN(Number(value));

    if (numericCheck && value !== '') {
      searchStore.addErrorMessage(message);
      validationState = 'error';
    }

    return validationState;
  }

  const searchValueByStoreOrDefaultValue = (column) => {
    let index = searchStore.detailSearchValues.findIndex((f) => { return Object.keys(f).indexOf(column) != -1; });
    return (index !== -1 ? { ...searchStore.detailSearchValues[index][column] } : defaultDetailSearchValues[0]);
  }

  const handleSubFieldChanged = (id, option, column, type) => (e) => {
    let sub_values = { id: id, value: e.target.value };
    setSearchStoreValues(e.target.value, option, column, type, sub_values, '');
  }

  const handleTableFieldChanged = (id, option, column, type) => (e) => {
    let value = e.target.value;
    let subValue = {};
    let optionField = option.sub_fields.find((f) => { return f.id == id });
    let searchValue = searchValueByStoreOrDefaultValue(column);

    if (optionField.value_system) {
      let valueSystem = searchValue.sub_values.length >= 1 && searchValue.sub_values[0][id]
        ? searchValue.sub_values[0][id].value_system
        : optionField.value_system;
      subValue = { id: id, value: { value: value, value_system: valueSystem } };
    } else {
      subValue = { id: id, value: value };
    }
    setSearchStoreValues(e.target.value, option, column, type, subValue, '');
  }

  const handleFieldChanged = (option, column, type) => (e) => {
    let value = valueByType(type, e);
    let smiles = column == 'solvent_smiles' ? e.value.smiles : '';

    if (column === 'datasets_type') {
      let datasetValues = searchStore.detailSearchValues.filter((f) => {
        return Object.keys(f)[0].startsWith('datasets_') && Object.keys(f)[0] !== 'datasets_type'
      });
      datasetValues.map((d) => {
        searchStore.removeDetailSearchValue(Object.keys(d)[0]);
      });
    }

    setSearchStoreValues(value, option, column, type, {}, smiles);
  }

  const setSearchStoreValues = (value, option, column, type, subValue, smiles) => {
    let searchValue = searchValueByStoreOrDefaultValue(column);
    let cleanedValue = ['>=', '<=', '<@'].includes(searchValue.match) ? value.replace(/,/g, '.') : value;
    searchValue.field = option;
    searchValue.value = cleanedValue;
    searchValue.sub_values = subValuesForSearchValue(searchValue, subValue, cleanedValue);
    searchValue.match = matchByField(column, type);
    searchValue.smiles = smiles;

    if (['>=', '<=', '<@'].includes(searchValue.match)) {
      searchValue.validationState = checkValueForNumber(option.label, cleanedValue);
    }

    if (type == 'system-defined' && searchValue.unit === '') {
      let units = optionsForSelect(option);
      searchValue.unit = units[0].label;
    }

    if (column.indexOf('temperature') !== -1 && value !== '' && value !== 0 && value !== "0") {
      searchValue = availableOptionsForTemperature(searchValue, value, searchValue.unit);
    }

    if (value === 'others' && option.type === 'select') {
      searchValue.available_options = [];
      optionsForSelect(option).map((object) => {
        if (object.value !== '' && object.value !== 'others') {
          searchValue.available_options.push(object);
        }
      });
    }

    let searchSubValuesLength = searchValue.sub_values.length >= 1 ? Object.keys(searchValue.sub_values[0]).length : 0;
    let typesWithSubValues = ['input-group', 'table'];

    if (((value === '' || value === false) && !typesWithSubValues.includes(type))
      || (searchSubValuesLength === 0 && typesWithSubValues.includes(type) && value === '')) {
      searchStore.removeDetailSearchValue(column);
    } else {
      searchStore.addDetailSearchValue(column, searchValue);
    }
  }

  const subValuesForSearchValue = (searchValue, subValue, value) => {
    let subValues = searchValue.sub_values;
    if (Object.keys(subValue).length === 0) { return subValues; }

    if (subValues.length == 0) {
      subValues.push({ [subValue.id]: subValue.value })
    } else {
      subValues[0][subValue.id] = subValue.value;
    }

    if (subValues[0][subValue.id] == '' && value == '') {
      delete subValues[0][subValue.id];
    }

    return subValues;
  }

  const availableOptionsForTemperature = (searchValue, startValue, startUnit) => {
    startValue = startValue.match(/^-?\d+(\.\d+)?$/g);

    if (startValue === null || isNaN(Number(startValue))) { return searchValue; }

    searchValue.available_options = [];
    searchValue.available_options.push({ value: startValue[0], unit: startUnit });

    let [convertedValue, convertedUnit] = convertTemperature(startValue[0], startUnit);
    searchValue.available_options.push({ value: convertedValue.trim(), unit: convertedUnit });

    [convertedValue, convertedUnit] = convertTemperature(convertedValue, convertedUnit);
    searchValue.available_options.push({ value: convertedValue.trim(), unit: convertedUnit });
    return searchValue;
  }

  const changeUnit = (units, value, column, option, subFieldId) => (e) => {
    let activeUnitIndex = units.findIndex((f) => { return f.label.replace('°', '') === value || f.label === value });
    let nextUnitIndex = activeUnitIndex === units.length - 1 ? 0 : activeUnitIndex + 1;
    let newUnit = units[nextUnitIndex].label;
    let searchValue = searchValueByStoreOrDefaultValue(column);

    if (option.sub_fields && subFieldId) {
      if (searchValue.sub_values.length >= 1 && searchValue.sub_values[0][subFieldId]) {
        searchValue.sub_values[0][subFieldId].value_system = newUnit;
      } else if (searchValue.sub_values.length >= 1 && !searchValue.sub_values[0][subFieldId]) {
        searchValue.sub_values[0][subFieldId] = { value: '', value_system: newUnit };
      } else {
        searchValue.sub_values.push({ [subFieldId]: { value: '', value_system: newUnit } });
      }
    }

    if (column.indexOf('temperature') !== -1 && searchValue.value !== '') {
      const nextValue = searchValue.available_options.find((v) => newUnit.indexOf(v.unit) !== -1);
      searchValue.value = nextValue.value;
    }
    searchValue.unit = newUnit;

    searchStore.addDetailSearchValue(column, searchValue);
  }

  const fieldsByType = (option, fields, keyLabel, i) => {
    let multi_fields = ['stereo', 'xref', 'solvent', 'body'];
    let column = multi_fields.includes(option.column) ? `${option.column}_${option.opt}` : (option.column || option.field);
    column = option.key !== undefined ? `${column}_${option.key}` : column;
    const selectedValue = searchStore.detailSearchValues.find((f) => { return Object.keys(f).indexOf(column) != -1 });

    switch (option.type) {
      case 'text':
      case 'textarea':
      case 'formula-field':
        fields.push(textInput(option, 'text', selectedValue, column, keyLabel));
        break;
      case 'sequence-textarea':
        fields.push(textareaInput(option, 'textarea', selectedValue, column, keyLabel));
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
      case 'chmos':
        fields.push(rxnoChmosInput(option, option.type, selectedValue, column));
        break;
      case 'system-defined':
        fields.push(systemDefinedInput(option, 'system-defined', selectedValue, column, keyLabel));
        break;
      case 'input-group':
        fields.push(inputGroupInput(option, 'input-group', selectedValue, column, keyLabel));
        break;
      case 'table':
        fields.push(componentHeadline(option.label, 'table', 'detail-search-headline'));
        fields.push(tableInputFields(option, 'table', selectedValue, column, keyLabel));
        break;
      case 'subGroupWithAddOn':
        fields.push(subGroupWithAddOnFields(option, 'subGroupWithAddOn', selectedValue, column, keyLabel));
        break;
      case 'solventSelect':
        fields.push(solventSelect(option, 'solventSelect', selectedValue, column, keyLabel));
        break;
      case 'spacer':
        fields.push(<div className="form-group" key={`empty-column-${i}`}></div>);
        break;
      case 'headline':
        fields.push(componentHeadline(option.label, 'headline', 'detail-search-headline'));
        break;
      case 'segment-headline':
        fields.push(componentHeadline(option.label, 'segment-headline', 'detail-search-segment-headline'));
        break;
      case 'hr':
        fields.push(<hr className='content-spacer' key={`spacer-${i}`} />);
        break;
      default:
        fields.push(textInput(option, 'text', selectedValue, column, keyLabel));
        break;
    }
    return fields;
  }

  const mapOptions = (options, fields) => {
    options.map((field, i) => {
      if (field.cond_fields && field.cond_fields.length >= 1) {
        let key = field.cond_fields[0].field;
        const valueFulfilled = searchStore.detailSearchValues.filter((value) => {
          return value[key] && value[key].value === field.cond_fields[0].value;
        });
        if (valueFulfilled.length === 0) { return }
      }

      if (Array.isArray(field.value)) {
        if (field.label) {
          fields.push(componentHeadline(field.label, i, 'detail-search-headline'));
        } else if (i != 0 && field.value[0].type !== 'table') {
          fields.push(<hr className='content-spacer' key={`spacer-${i}`} />);
        }

        field.value.map((option) => {
          fields = fieldsByType(option, fields, field.label, i);
        });
      } else {
        fields = fieldsByType(field.value, fields, selection.table, i);
      }
    });
    return fields;
  }

  const handleSelectTab = (e) => {
    searchStore.changeActiveTabKey(e * 1);
  }

  const addTabToTabFields = (title, value, i, tabFields) => {
    tabFields.push(
      <Tab
        eventKey={i}
        title={title}
        key={`tab-${title.toLowerCase().replace(' ', '-')}-${i}`}
      >
        <Form className="detail-search-form" noValidate>
          {mapOptions(value, [])}
        </Form>
      </Tab>
    );
    return tabFields;
  }

  const FormElementTabs = () => {
    let tabFields = [];

    if (fieldsByTab.length >= 1) {
      fieldsByTab.map((field, i) => {
        addTabToTabFields(field.label, field.value, i, tabFields)
      });
    }

    return (
      <Tabs
        activeKey={searchStore.activeTabKey}
        transition={false}
        onSelect={handleSelectTab}
        id="detail-search-element-tabs"
        className="detail-search-element-tabs"
        key="form-element-tabs"
        navbar={false}
      >
        {tabFields}
      </Tabs>
    );
  }

  return (
    <div className='detail-search-content'>
      {FormElementTabs()}
    </div>
  );
}
export default observer(DetailSearch);
