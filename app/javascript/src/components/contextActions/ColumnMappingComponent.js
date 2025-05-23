import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Form,
  Button,
  Row,
  Col,
  Card,
} from 'react-bootstrap';

function ColumnMappingComponent({
  columnNames,
  modelName,
  disabled,
  onMappedColumnsChange,
}) {
  const [viewMode, setViewMode] = useState('row');
  const [mappedColumns, setMappedColumns] = useState({});
  const [modelKeys, setModelKeys] = useState([]);

  // Sample and chemical keys for mapping options
  const sampleKeys = [
    'name', 'cas', 'molecule_name', 'external_label', 'short_label', 'description', 'decoupled',
    'real_amount_value', 'real_amount_unit', 'target_amount_value', 'target_amount_unit',
    'molarity', 'density', 'molfile', 'purity', 'solvent',
    'location', 'is_top_secret', 'anhydrous', 'imported_readout', 'melting_point',
    'boiling_point', 'refractive_index', 'flash_point', 'molecular_mass', 'canonical_smiles',
    'dry_solvent', 'stereo_abs', 'stereo_rel', 'sum_formula',
  ];

  const chemicalSampleKeys = [...sampleKeys,
    'status', 'vendor', 'order_number', 'amount', 'volume', 'price',
    'person', 'required_date', 'ordered_date', 'expiration_date',
    'storage_temperature', 'required_by', 'safety_sheet_link_merck',
    'safety_sheet_link_thermofischer', 'product_link_merck', 'product_link_thermofischer',
    'pictograms', 'h_statements', 'p_statements', 'host_building', 'host_room',
    'host_cabinet', 'host_group', 'owner', 'current_building', 'current_room',
    'current_cabinet', 'current_group', 'borrowed_by', 'disposal_info', 'important_notes',
  ];

  useEffect(() => {
    setModelKeys(modelName === 'chemical' ? chemicalSampleKeys.sort() : sampleKeys.sort());
  }, [modelName]);

  const handleSmartMapping = () => {
    const smartMapped = {};

    // Simplified core mappings with base field names
    const coreFieldMappings = {
      // Main target fields
      molecular_mass: 'molecular_mass',
      molecule_name: 'molecule_name',
      sum_formula: 'sum_formula',
      boiling_point: 'boiling_point',
      boiling_pt: 'boiling_point',
      melting_point: 'melting_point',
      melting_pt: 'melting_point',
      target_amount: 'target_amount_value',
      target_unit: 'target_amount_unit',
      real_amount: 'real_amount_value',
      real_unit: 'real_amount_unit',
      dry_solvent: 'dry_solvent',
      is_top_secret: 'is_top_secret',
      top_secret: 'is_top_secret',
      secret: 'is_top_secret',
      canonical_smiles: 'canonical_smiles',
      solvent: 'solvent',
      stereo_abs: 'stereo_abs',
      stereo_rel: 'stereo_rel',
      decoupled: 'decoupled',
      residue_type: 'residue_type',
      sample_name: 'name',
      name: 'name',
      sample_external_label: 'external_label',
      external_label: 'external_label',
      cas: 'cas'
    };

    // Process each column name for mapping
    columnNames.forEach((colName) => {
      const originalColName = colName;

      // Create a normalized version of the column name for better matching:
      // 1. Convert to lowercase
      // 2. Remove parenthetical content like (DECOUPLED)
      // 3. Replace underscores with spaces
      const normalizedColName = colName.toLowerCase()
        .replace(/\s*\([^)]*\)\s*/g, '') // Remove parenthetical content
        .replace(/_/g, ' ') // Convert underscores to spaces
        .trim(); // Clean up whitespace

      // Extract base name (remove "decoupled" if present)
      const baseFieldName = normalizedColName.replace(/\s*decoupled\s*/g, '').trim();

      // Tracking the matched field
      let matchedField = null;

      // Priority 1: Try direct matches with field mappings
      Object.entries(coreFieldMappings).some(([key, value]) => {
        const normalizedKey = key.replace(/_/g, ' ').toLowerCase();

        // Check for exact match first with normalized or base name
        if (normalizedColName === normalizedKey || baseFieldName === normalizedKey) {
          matchedField = value;
          return true;
        }

        // Then try to find if the normalized key is contained within the column name
        if (normalizedColName.includes(normalizedKey)) {
          // Special handling for "dry solvent" to avoid matching just "solvent"
          if (key === 'solvent' && normalizedColName.includes('dry')) {
            matchedField = 'dry_solvent';
          } else {
            matchedField = value;
          }
          return true;
        }
        return false;
      });

      // Priority 2: If no match yet, try to match against any model key
      if (!matchedField) {
        modelKeys.some((modelKey) => {
          const normalizedModelKey = modelKey.replace(/_/g, ' ');
          if (normalizedColName.includes(normalizedModelKey)) {
            matchedField = modelKey;
            return true;
          }
          return false;
        });
      }

      // Priority 3: Special case handling for specific patterns
      // Handle columns with "MOLECULAR_MASS_(DECOUPLED)" pattern
      if (normalizedColName.includes('molecular mass') && normalizedColName.includes('decoupled')) {
        matchedField = 'molecular_mass';
      }
      // Handle columns with "SUM_FORMULA_(DECOUPLED)" pattern
      if (normalizedColName.includes('sum formula') && normalizedColName.includes('decoupled')) {
        matchedField = 'sum_formula';
      }
      // Store the mapping result
      smartMapped[originalColName] = matchedField || 'do_not_import';
    });

    setMappedColumns(smartMapped);
    onMappedColumnsChange(smartMapped);
  };

  const handleColumnMappingChange = (columnName, value) => {
    const updatedMappings = {
      ...mappedColumns,
      [columnName]: value
    };
    setMappedColumns(updatedMappings);
    onMappedColumnsChange(updatedMappings);
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
              <option value="do_not_import">do not import</option>
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
              <option value="do_not_import">do not import</option>
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
      <h4>
        Map Columns -
        {' '}
        {modelName}
      </h4>
      <div className="d-flex justify-content-between mt-3 mb-3">
        <Button
          variant="outline-secondary"
          onClick={() => setViewMode(viewMode === 'row' ? 'column' : 'row')}
          disabled={disabled}
        >
          Switch to
          {' '}
          { viewMode === 'row' ? 'Column' : 'Row' }
          {' '}
          View
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

    </div>
  );
}

ColumnMappingComponent.propTypes = {
  columnNames: PropTypes.arrayOf(PropTypes.string).isRequired,
  modelName: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  onMappedColumnsChange: PropTypes.func.isRequired,
};

ColumnMappingComponent.defaultProps = {
  disabled: false,
};

export default ColumnMappingComponent;
