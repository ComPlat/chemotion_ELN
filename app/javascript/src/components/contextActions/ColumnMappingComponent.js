import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Form, Button, Row, Col, Card } from 'react-bootstrap';

function ColumnMappingComponent({ columnNames, modelName, onValidate, convertToFieldName, disabled }) {
  const [viewMode, setViewMode] = useState('row');
  const [mappedColumns, setMappedColumns] = useState({});
  const [modelKeys, setModelKeys] = useState([]);

  // Sample and chemical keys for mapping options
  const sampleKeys = [
    'name', 'cas', 'molecule_name', 'external_label', 'short_label', 'description',
    'real_amount_value', 'real_amount_unit', 'target_amount_value', 'target_amount_unit',
    'molarity_value', 'molarity_unit', 'density', 'molfile', 'purity', 'solvent',
    'location', 'is_top_secret', 'anhydrous', 'imported_readout', 'melting_point',
    'boiling_point', 'refractive_index', 'flash_point', 'created_at', 'updated_at',
    'user_labels', 'literature', 'sample_svg_file', 'molecule_svg_file', 'molecular_mass',
    'sum_formula'
  ];

  const chemicalKeys = [
    'name', 'cas', 'molfile', 'inchi', 'inchikey', 'canonical_smiles',
    'status', 'vendor', 'order_number', 'amount', 'volume', 'price',
    'person', 'required_date', 'ordered_date', 'expiration_date',
    'storage_temperature', 'required_by', 'safety_sheet_link_merck',
    'safety_sheet_link_thermofischer', 'product_link_merck', 'product_link_thermofischer',
    'pictograms', 'h_statements', 'p_statements', 'host_building', 'host_room',
    'host_cabinet', 'host_group', 'owner', 'current_building', 'current_room',
    'current_cabinet', 'current_group', 'borrowed_by', 'disposal_info', 'important_notes',
    'molecular_mass', 'sum_formula'
  ];

  useEffect(() => {
    setModelKeys(modelName === 'chemical' ? chemicalKeys : sampleKeys);
  }, [modelName]);

  const handleSmartMapping = () => {
    const smartMapped = {};

    columnNames.forEach((colName) => {
      // Use the convertToFieldName function if available, otherwise fallback to simple conversion
      const convertedName = convertToFieldName
        ? convertToFieldName(colName)
        : colName.toLowerCase().replace(/\s+/g, '_');

      // Try exact match first
      let matchedKey = modelKeys.find((key) => key === convertedName);
      
      if (!matchedKey) {
        // Try partial matches
        matchedKey = modelKeys.find((key) => (
          convertedName.includes(key) || key.includes(convertedName)
        ));
      }

      smartMapped[colName] = matchedKey || 'do_not_import';
    });

    setMappedColumns(smartMapped);
  };

  const handleColumnMappingChange = (columnName, value) => {
    setMappedColumns((prev) => ({
      ...prev,
      [columnName]: value
    }));
  };

  const handleValidate = () => {
    onValidate(mappedColumns);
  };

  // Render rows view
  const renderRowView = () => (
    <div className="mapping-rows" style={{ maxHeight: '400px', overflowY: 'auto' }}>
      {columnNames.map((name) => (
        <Row key={`row-view-${name}`} className="mb-2 align-items-center">
          <Col xs={4}>
            <strong>{name}</strong>
          </Col>
          <Col xs={8}>
            <Form.Select
              value={mappedColumns[name] || 'do_not_import'}
              onChange={(e) => handleColumnMappingChange(name, e.target.value)}
              disabled={disabled}
            >
              <option value="do_not_import">Do not import</option>
              {modelKeys.map((key) => (
                <option key={`option-${key}`} value={key}>{key}</option>
              ))}
            </Form.Select>
          </Col>
        </Row>
      ))}
    </div>
  );

  // Render columns view
  const renderColumnView = () => (
    <div className="mapping-columns d-flex flex-wrap" style={{ maxHeight: '400px', overflowY: 'auto' }}>
      {columnNames.map((name) => (
        <Card key={`col-view-${name}`} className="m-2" style={{ width: '200px' }}>
          <Card.Header>{name}</Card.Header>
          <Card.Body>
            <Form.Select
              value={mappedColumns[name] || 'do_not_import'}
              onChange={(e) => handleColumnMappingChange(name, e.target.value)}
              disabled={disabled}
            >
              <option value="do_not_import">Do not import</option>
              {modelKeys.map((key) => (
                <option key={`option-${key}`} value={key}>{key}</option>
              ))}
            </Form.Select>
          </Card.Body>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="column-mapping-container mt-3 mb-3">
      <h4>Map Columns - {modelName}</h4>
      <div className="d-flex justify-content-between mb-3">
        <Button
          variant="outline-secondary"
          onClick={() => setViewMode(viewMode === 'row' ? 'column' : 'row')}
          disabled={disabled}
        >
          Switch to {viewMode === 'row' ? 'Column' : 'Row'} View
        </Button>
        <Button
          variant="outline-primary"
          onClick={handleSmartMapping}
          disabled={disabled}
        >
          Smart Mapping
        </Button>
      </div>

      {viewMode === 'row' ? renderRowView() : renderColumnView()}

      <div className="mt-3 text-end">
        <Button
          variant="primary"
          onClick={handleValidate}
          disabled={disabled}
        >
          Validate Column Mapping
        </Button>
      </div>
    </div>
  );
}

ColumnMappingComponent.propTypes = {
  columnNames: PropTypes.arrayOf(PropTypes.string).isRequired,
  modelName: PropTypes.string.isRequired,
  onValidate: PropTypes.func.isRequired,
  convertToFieldName: PropTypes.func,
  disabled: PropTypes.bool,
};

ColumnMappingComponent.defaultProps = {
  convertToFieldName: null,
  disabled: false,
};

export default ColumnMappingComponent;