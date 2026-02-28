import React, {
  useState,
  useCallback,
  useEffect,
  useRef
} from 'react';
import PropTypes from 'prop-types';
import { AgGridReact } from 'ag-grid-react';
import { Modal, Button, Alert } from 'react-bootstrap';
import {
  validateRowUnified
} from 'src/utilities/importDataValidations';
import TextAreaCellEditor from 'src/apps/mydb/collections/TextAreaCellEditor';
import DocumentationButton from 'src/components/common/DocumentationButton';

// Create a separate component for the delete button cell renderer
function DeleteButtonCellRenderer(props) {
  const { onDelete, data } = props;
  const onClick = () => {
    if (onDelete) {
      onDelete(data?.id);
    }
  };

  return (
    <button
      type="button"
      className="btn btn-sm btn-danger"
      onClick={onClick}
    >
      <i className="fa fa-trash" />
    </button>
  );
}

DeleteButtonCellRenderer.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ])
  }),
  onDelete: PropTypes.func
};

DeleteButtonCellRenderer.defaultProps = {
  data: null,
  onDelete: null
};

function ValidationComponent({
  rowData: initialRowData,
  columnDefs,
  onValidate,
  onCancel,
  onRowDataChange,
  onImport
}) {
  const [gridApi, setGridApi] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [conversionMessages, setConversionMessages] = useState([]);
  const [showMore, setShowMore] = useState(false);
  const [gridColumnDefs, setGridColumnDefs] = useState([]);
  const [currentRowData, setCurrentRowData] = useState(initialRowData);
  const [isValidated, setIsValidated] = useState(false);
  const [isDataValid, setIsDataValid] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const gridRef = useRef(null);

  // Initialize current row data from props and ensure all rows have IDs
  useEffect(() => {
    const dataWithIds = initialRowData.map((row, index) => ({
      ...row,
      id: row.id || `row-${index + 1}`
    }));
    setCurrentRowData(dataWithIds);
  }, [initialRowData]);

  // Handler for the delete button click - simplified to work directly with row ID
  const handleDeleteRow = useCallback((rowId) => {
    if (rowId) {
      // Filter out the row with the matching ID
      const newData = currentRowData.filter((row) => row.id !== rowId);

      // Update state
      setCurrentRowData(newData);
      onRowDataChange(newData);

      // Request a grid refresh after state update
      setTimeout(() => {
        if (gridApi) {
          gridApi.refreshCells({ force: true });
        }
      }, 0);
    }
  }, [currentRowData, gridApi]);

  // Add row number and action columns to the column definitions
  useEffect(() => {
    const rowNumberColumn = {
      headerName: '#',
      valueGetter: 'node.rowIndex + 1',
      width: 70,
      editable: false,
      sortable: false,
      filter: false,
      pinned: 'left',
      suppressMenu: true,
      suppressSizeToFit: true
    };

    const deleteButtonColumn = {
      headerName: '',
      field: 'delete',
      width: 70,
      editable: false,
      sortable: false,
      filter: false,
      suppressMenu: true,
      cellRenderer: 'deleteButtonCellRenderer',
      cellRendererParams: {
        onDelete: handleDeleteRow
      }
    };

    // Process column defs to add special handling for molfile columns
    const processedColumnDefs = columnDefs.map((colDef) => {
      // Check if this is a molfile column based on field name or header
      const isMolfileColumn = (colDef.headerName && colDef.headerName.toLowerCase().includes('molfile'));

      if (isMolfileColumn) {
        return {
          ...colDef,
          cellEditor: 'textAreaCellEditor',
          cellEditorPopup: true,
          stopEditingWhenCellsLoseFocus: false,
          singleClickEdit: false,
          editable: true,
          // Used by AG Grid for displaying values - we want raw values
          valueFormatter: (params) => params.value,
          valueSetter: (params) => {
            // Called when cell editing ends to save changes
            if (params.newValue !== undefined && params.newValue !== null) {
              // Must create a new reference to trigger proper refresh
              const rowData = { ...params.data };
              rowData[params.colDef.field] = params.newValue;

              // Set the updated data back to the row
              params.node.setData(rowData);

              // Update React state directly as well
              const { rowIndex } = params.node;
              if (rowIndex !== undefined) {
                const updatedRowData = [...currentRowData];
                updatedRowData[rowIndex] = rowData;
                setCurrentRowData(updatedRowData);
                onRowDataChange(updatedRowData);
              }

              // Force refresh this cell
              if (params.api) {
                params.api.refreshCells({
                  force: true,
                  rowNodes: [params.node],
                  columns: [params.colDef.field]
                });
              }
              return true;
            }
            return false;
          },
          cellRenderer: (params) => {
            if (!params.value) return '';
            // Show a preview of the molfile (first line only)
            const lines = params.value.split('\n');
            const firstLine = lines[0] || '';
            // Return only the text content, not wrapped in HTML
            return firstLine ? `${firstLine.trim()} (${lines.length} lines)` : '';
          }
        };
      }
      return colDef;
    });

    // Add the row number and delete columns to the column definitions
    setGridColumnDefs([rowNumberColumn, ...processedColumnDefs, deleteButtonColumn]);
  }, [columnDefs, handleDeleteRow]);

  const onGridReady = useCallback((params) => {
    setGridApi(params.api);
  }, []);

  const getRowClass = (params) => (
    params.data && params.data.valid === false ? 'invalid-row' : ''
  );

  const validateData = async () => {
    if (!gridApi) return;

    // Use currentRowData as the single source of truth
    const allRows = [...currentRowData];
    const invalid = [];
    const allConversions = [];

    // Log the field names across all rows to help debug
    const allFields = new Set();
    allRows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (key !== 'id' && key !== 'valid' && key !== 'errors') {
          allFields.add(key);
        }
      });
    });

    // Use Promise.all to run validations in parallel
    const validationPromises = allRows.map(async (row, index) => {
      // Apply field-by-field validation based on each field type
      const validation = await validateRowUnified(row);

      if (!validation.valid) {
        const updatedRow = {
          ...row,
          valid: false,
          errors: validation.errors,
          rowIndex: index
        };
        Object.assign(row, updatedRow);
        invalid.push(updatedRow);
        return false;
      }

      // Handle conversions - update the row with converted data
      if (validation.convertedData) {
        Object.assign(row, validation.convertedData);
      }

      // Collect conversion messages with row numbers
      if (validation.conversions && validation.conversions.length > 0) {
        validation.conversions.forEach((conversionMsg) => {
          allConversions.push(`Row ${index + 1}: ${conversionMsg.replace('Field "', '').replace('":', ' -')}`);
        });
      }

      Object.assign(row, { ...row, valid: true });
      return true;
    });

    await Promise.all(validationPromises);

    const allErrors = invalid.flatMap((row) => {
      // Use the stored rowIndex for consistent numbering
      const rowNumber = (row.rowIndex !== undefined) ? row.rowIndex + 1 : 'unknown';

      return (row.errors || []).map((error) => `Row ${rowNumber}: ${error}`);
    });

    setValidationErrors(allErrors);
    setConversionMessages(allConversions);
    setIsValidated(true);
    setIsDataValid(invalid.length === 0);

    // Update the currentRowData with validation results and conversions
    setCurrentRowData(allRows);
    onRowDataChange(allRows);

    gridApi.refreshCells();
    onValidate(invalid, allRows);
  };

  const handleImportData = () => {
    if (onImport) {
      onImport();
    }
  };

  const addNewRow = () => {
    // Generate a user-friendly row ID based on current data length
    const newRowNumber = currentRowData.length + 1;
    const newRow = {
      id: `row-${newRowNumber}`,
      valid: true
    };

    // Add the new row and update state
    const newData = [...currentRowData, newRow];
    setCurrentRowData(newData);
    onRowDataChange(newData);

    // Scroll to the new row
    setTimeout(() => {
      if (gridApi) {
        gridApi.paginationGoToPage(gridApi.paginationGetTotalPages() - 1);
        gridApi.ensureIndexVisible(newData.length - 1, 'bottom');
      }
    }, 100);
  };

  // Handle cell value changes
  const onCellValueChanged = (params) => {
    // Reset validation state when data changes
    setIsValidated(false);
    setIsDataValid(false);
    setValidationErrors([]);
    setConversionMessages([]);

    // Update the current row data when a cell changes
    const updatedData = [...currentRowData];
    const {
      rowIndex,
      newValue,
      colDef,
      data,
      api,
      node
    } = params;

    if (rowIndex !== undefined && rowIndex >= 0 && rowIndex < updatedData.length) {
      // Preserve the original formatting of pasted content by using the raw value
      if (newValue !== undefined && colDef && colDef.field) {
        // Create a new object for this row to avoid reference issues
        const updatedRow = { ...data };
        // This preserves exact formatting of molfile data when pasted
        updatedRow[colDef.field] = newValue;

        // Update row data
        updatedData[rowIndex] = updatedRow;

        // Also update the grid's data model to ensure consistency
        if (node && api) {
          node.setData(updatedRow);
          // Force refresh this specific cell
          api.refreshCells({
            force: true,
            rowNodes: [node],
            columns: [colDef.field]
          });
        }
      } else {
        updatedData[rowIndex] = { ...data };
      }

      // Update React state
      setCurrentRowData(updatedData);

      // Notify parent component of the data change
      if (onRowDataChange) {
        onRowDataChange(updatedData);
      }
    }
  };
  const chemotionSaurusLink = 'https://www.chemotion.net/docs/eln/ui/import';
  const documentationLink = `${chemotionSaurusLink}#importing-data-with-column-mapping-and-validation`;

  return (
    <Modal show size="xl" backdrop="static">
      <Modal.Header>
        <Modal.Title>Validate Data to import</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <p>
                Review and edit your data before importing.
                You can modify cell values directly, add new rows, or delete existing ones.
              </p>
              <p>Invalid rows will be highlighted in red after validation.</p>
            </div>
            <DocumentationButton
              link={documentationLink}
              overlayMessage="Click to open link to the documentation of the feature"
              className="ms-3 flex-shrink-0"
            />
          </div>
        </div>

        <Alert variant="warning" className="mb-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <i className="fa fa-exclamation-triangle me-2" />
              <strong>Important: Structure Validation Notice</strong>
            </div>
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowWarning(!showWarning)}
              className="p-0 text-warning"
            >
              {showWarning ? (
                <>
                  <i className="fa fa-chevron-up me-1" />
                  Hide Details
                </>
              ) : (
                <>
                  <i className="fa fa-chevron-down me-1" />
                  Show Details
                </>
              )}
            </Button>
          </div>
          {showWarning && (
            <div className="mt-3 pt-3 border-top border-warning">
              <p className="mb-2">
                <strong>Please note:</strong>
                {' '}
                Data related to chemical structures like Canonical SMILES, molfile and other chemical
                {' '}
                identifiers cannot be validated at this step.
                {' '}
                If structure-related data is invalid, you will receive an informative notification message after the
                {' '}
                import process completes.
              </p>
            </div>
          )}
        </Alert>

        {validationErrors.length > 0 && isValidated && (
          <Alert variant="danger">
            <Alert.Heading>Validation Errors</Alert.Heading>
            <ul>
              {validationErrors
                .slice(0, showMore ? validationErrors.length : 5)
                .map((error) => (
                  <li key={`validation-error-${error}`}>{error}</li>
                ))}
            </ul>
            {validationErrors.length > 5 && !showMore && (
              <Button
                variant="link"
                onClick={() => setShowMore(true)}
                className="p-0"
              >
                Show all
                {' '}
                {validationErrors.length}
                {' '}
                errors...
              </Button>
            )}
          </Alert>
        )}

        {isValidated && isDataValid && (
          <Alert variant="success" className="mr-5">
            <div>
              <Alert.Heading className="mb-0 me-3">
                <i className="fa fa-check-circle me-1" />
                Data is Valid:
              </Alert.Heading>
              <p className="mb-0 mt-1 ps-5">
                All rows have passed validation successfully. You can now import the data.
              </p>
            </div>

            {conversionMessages.length > 0 && (
              <div className="mt-3 mb-3">
                <strong>Unit Conversions Applied:</strong>
                <ul className="mt-2 mb-0">
                  {conversionMessages.map((message) => (
                    <li key={`conversion-${message}`} className="text-info">
                      {message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="d-flex align-items-center">
              <div className="mb-0 ps-5">
                Click on
                {' '}
                <strong>Import Data</strong>
                {' '}
                button to import
                {' '}
                <strong>{currentRowData.length}</strong>
                {' '}
                rows
              </div>
              <Button
                variant="success"
                onClick={handleImportData}
                className="ms-auto"
              >
                <i className="fa fa-upload me-1" />
                Import Data
              </Button>
            </div>
          </Alert>
        )}

        <div className="ag-theme-alpine" style={{ height: 400, width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={currentRowData}
            columnDefs={gridColumnDefs}
            pagination
            paginationPageSize={20}
            onGridReady={onGridReady}
            getRowClass={getRowClass}
            onCellValueChanged={onCellValueChanged}
            defaultColDef={{
              editable: true,
              resizable: true,
              sortable: true,
              filter: true
            }}
            components={{
              deleteButtonCellRenderer: DeleteButtonCellRenderer,
              textAreaCellEditor: TextAreaCellEditor
            }}
          />
        </div>

        <div className="d-flex justify-content-between mt-3">
          <div>
            <Button
              variant="success"
              onClick={addNewRow}
              className="me-2"
            >
              <i className="fa fa-plus me-1" />
              Add Row
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (gridApi) {
                  gridApi.paginationGoToPage(gridApi.paginationGetTotalPages() - 1);
                }
              }}
            >
              Show More Rows
            </Button>
          </div>
          <div>
            <Button
              onClick={() => onCancel()}
              className="me-2 btn-light"
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={validateData}>
              Validate Data
            </Button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}

ValidationComponent.propTypes = {
  rowData: PropTypes.arrayOf(
    PropTypes.shape({
      valid: PropTypes.bool
    })
  ).isRequired,
  columnDefs: PropTypes.arrayOf(
    PropTypes.shape({
      field: PropTypes.string.isRequired,
      headerName: PropTypes.string
    })
  ).isRequired,
  onValidate: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onRowDataChange: PropTypes.func.isRequired,
  onImport: PropTypes.func.isRequired,
};

export default ValidationComponent;
