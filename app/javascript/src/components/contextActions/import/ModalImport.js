import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, ButtonToolbar, Form, Modal
} from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import UIStore from 'src/stores/alt/stores/UIStore';
import readXlsxFile from 'read-excel-file';
import { parse as parseSdf } from 'sdf-parser';

import ElementActions from 'src/stores/alt/actions/ElementActions';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import ColumnMappingComponent from 'src/components/contextActions/ColumnMappingComponent';
import ValidationComponent from 'src/components/contextActions/ValidationComponent';

export default class ModalImport extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      file: null,
      importAsChemical: false,
      importWithColumnMapping: false,
      showColumnMapping: false,
      showValidation: false,
      columnNames: [],
      rowData: [],
      columnDefs: [],
      fileDelimiter: '\t',
      fileFormat: null,
      isProcessing: false
    };
  }

  handleClick() {
    const { onHide } = this.props;
    const { file, importAsChemical, importWithColumnMapping } = this.state;
    const uiState = UIStore.getState();
    const params = {
      file,
      currentCollectionId: uiState.currentCollection.id,
      type: importAsChemical ? 'chemical' : 'sample',
    };

    if (importWithColumnMapping) {
      // Show column mapping component and extract column names from file
      this.extractColumnNames(file);
    } else {
      ElementActions.importSamplesFromFile(params);
      onHide();

      const notification = {
        title: 'Uploading',
        message: 'The file is being processed. Please wait...',
        level: 'warning',
        dismissible: false,
        uid: 'import_samples_upload',
        position: 'bl'
      };

      NotificationActions.add(notification);
    }
  }

  handleFileDrop(attachmentFile) {
    this.setState({ file: attachmentFile[0] });
  }

  handleAttachmentRemove() {
    this.setState({ file: null });
  }

  handleValidation(invalidRows) {
    const { onHide } = this.props;
    const { file, importAsChemical, rowData } = this.state;

    if (invalidRows.length > 0) {
      // Some rows have validation errors, show notification but keep the modal open
      NotificationActions.add({
        title: 'Validation Error',
        message: `Found ${invalidRows.length} invalid rows. Please correct them before importing.`,
        level: 'error',
        dismissible: true,
      });
    } else {
      // All rows valid, proceed with import
      const uiState = UIStore.getState();
      
      // Get the current valid data from the grid
      const validData = rowData.filter(row => 
        // Filter out rows that might have been marked for deletion
        !row.delete && (row.valid !== false)
      );
      
      // Prepare data for backend
      const cleanedData = validData.map(row => {
        const cleanRow = { ...row };
        // Remove UI-specific properties
        delete cleanRow.id;
        delete cleanRow.valid;
        delete cleanRow.errors;
        delete cleanRow.delete;
        return cleanRow;
      });
      
      const params = {
        file,
        currentCollectionId: uiState.currentCollection.id,
        type: importAsChemical ? 'chemical' : 'sample',
        validatedData: cleanedData
      };

      ElementActions.importSamplesFromFile(params);
      onHide();

      NotificationActions.add({
        title: 'Uploading',
        message: 'The validated data is being processed. Please wait...',
        level: 'warning',
        dismissible: false,
        uid: 'import_samples_upload',
        position: 'bl'
      });
    }
  }

  handleCancelValidation(updatedRowData) {
    // If updated data is provided, set it in the state
    if (updatedRowData) {
      this.setState({
        rowData: updatedRowData,
        showValidation: false,
        showColumnMapping: true
      });
    } else {
      this.setState({
        showValidation: false,
        showColumnMapping: true
      });
    }
  }

  async handleColumnMappingValidation(mappedColumns) {
    this.setState({ isProcessing: true });

    try {
      // Validate mappedColumns
      if (!mappedColumns || Object.keys(mappedColumns).length === 0) {
        throw new Error('No columns were mapped for import');
      }

      // Check if at least one column is being imported
      const importingColumns = Object.values(mappedColumns).filter(
        (value) => value !== 'do_not_import'
      );
      
      if (importingColumns.length === 0) {
        throw new Error('Please map at least one column to import');
      }

      console.log('Mapped columns for validation:', mappedColumns);
      
      // Extract the actual data from the file based on the mapped columns
      const mappedRowData = await this.extractDataFromFile(mappedColumns);
      
      if (!mappedRowData || !Array.isArray(mappedRowData) || mappedRowData.length === 0) {
        throw new Error('No data could be extracted from the file with the current column mapping');
      }
      
      // Ensure each row has a unique ID for proper tracking in the grid
      const rowDataWithIds = mappedRowData.map((row, index) => ({
        ...row,
        id: row.id || Date.now() + index,
        valid: true
      }));
      
      const columnDefs = this.generateColumnDefs(mappedColumns);

      this.setState({
        showValidation: true,
        showColumnMapping: false,
        rowData: rowDataWithIds,
        columnDefs,
        isProcessing: false
      });
    } catch (error) {
      console.error('Data extraction error:', error);
      this.setState({ isProcessing: false });
      NotificationActions.add({
        title: 'Error',
        message: `Failed to extract data from file for validation: ${error.message}`,
        level: 'error',
        dismissible: true,
      });
    }
  }

  async extractDataFromFile(mappedColumns) {
    const {
      file,
      fileFormat,
      fileDelimiter,
      excelData,
      sdfData
    } = this.state;

    try {
      console.log('Extracting data from file:', {
        fileFormat,
        fileDelimiter,
        hasExcelData: !!excelData && excelData.length > 0,
        hasSdfData: !!sdfData && sdfData.length > 0,
        mappedColumnsCount: Object.keys(mappedColumns).length
      });

      // Handle different file formats
      switch (fileFormat) {
        case 'excel':
          return this.extractDataFromExcel(excelData, mappedColumns);
        case 'sdf':
          return ModalImport.extractDataFromSDF(sdfData, mappedColumns);
        default:
          return ModalImport.extractDataFromText(file, fileDelimiter, mappedColumns);
      }
    } catch (error) {
      console.error('Error in extractDataFromFile:', error);
      throw new Error(`Data extraction failed for ${fileFormat} format: ${error.message}`);
    }
  }

  static extractDataFromSDF(sdfData, mappedColumns) {
    if (!sdfData || !sdfData.length) {
      console.warn('No SDF data available for extraction');
      return [];
    }

    try {
      const rowData = [];

      // Process each molecule
      sdfData.forEach((molecule, index) => {
        if (!molecule) {
          console.warn(`Skipping empty molecule at index ${index}`);
          return; // Skip this iteration
        }

        const dataRow = { id: index + 1, valid: true };

        // Map properties to their corresponding column names
        Object.entries(mappedColumns).forEach(([originalCol, mappedCol]) => {
          if (mappedCol !== 'do_not_import') {
            if (originalCol === 'molfile') {
              dataRow[mappedCol] = molecule.molfile || '';
            } else if (molecule.properties && molecule.properties[originalCol] !== undefined) {
              const propValue = molecule.properties[originalCol];
              dataRow[mappedCol] = propValue !== null && propValue !== undefined 
                ? String(propValue).trim() 
                : '';
            }
          }
        });

        rowData.push(dataRow);
      });

      console.log(`Extracted ${rowData.length} molecules from SDF`);
      return rowData;
    } catch (error) {
      console.error('Error extracting data from SDF:', error);
      throw new Error(`SDF data extraction failed: ${error.message}`);
    }
  }

  static extractDataFromText(file, delimiter, mappedColumns) {
    if (!file) {
      console.warn('No text file provided for extraction');
      throw new Error('Text file is missing for data extraction');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (evt) => {
        try {
          const fileContent = evt.target.result;
          if (!fileContent) {
            throw new Error('Empty file content');
          }
          
          const lines = fileContent.split(/\r?\n/);
          if (lines.length === 0) {
            throw new Error('No lines found in file');
          }
          
          const headers = lines[0].split(delimiter);
          if (headers.length === 0) {
            throw new Error('No headers found in file');
          }

          // Create a mapping from header index to mapped column name
          const columnMap = {};
          Object.entries(mappedColumns).forEach(([originalCol, mappedCol]) => {
            if (mappedCol !== 'do_not_import') {
              const headerIndex = headers.findIndex((h) => h.trim() === originalCol);
              if (headerIndex !== -1) {
                columnMap[headerIndex] = mappedCol;
              }
            }
          });

          if (Object.keys(columnMap).length === 0) {
            console.warn('No columns were mapped for import');
          }

          // Parse the data rows
          const rowData = [];
          for (let i = 1; i < lines.length; i += 1) {
            const line = lines[i].trim();
            // Skip empty lines
            if (line !== '') {
              const values = lines[i].split(delimiter);
              const row = { id: i, valid: true };

              // Map values to their corresponding column names
              Object.entries(columnMap).forEach(([indexStr, columnName]) => {
                const index = parseInt(indexStr, 10);
                if (!isNaN(index) && index < values.length) {
                  row[columnName] = values[index] ? values[index].trim() : '';
                }
              });

              rowData.push(row);
            }
          }

          console.log(`Extracted ${rowData.length} data rows from text file`);
          resolve(rowData);
        } catch (error) {
          console.error('Error parsing text file data:', error);
          reject(new Error(`Text file parsing failed: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('FileReader error while reading text file'));
      };

      reader.readAsText(file);
    });
  }

  static containsBinaryContent(content) {
    // Check if content contains non-printable characters or null bytes
    // This is a simple heuristic to detect binary content
    const sample = content.substring(0, 1000);
    // Look for control characters excluding common whitespace
    return /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(sample);
  }

  static detectDelimiter(content) {
    // Sample first few lines
    const sampleLines = content.split(/\r?\n/).slice(0, 5).join('\n');
    // Count occurrences of common delimiters
    const delimiters = ['\t', ',', ';', '|'];
    const counts = {};
    delimiters.forEach((delimiter) => {
      counts[delimiter] = (sampleLines.match(
        new RegExp(delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      ) || []).length;
    });
    // Find the delimiter with the most occurrences
    const mostCommonDelimiter = delimiters.reduce((a, b) => counts[a] > counts[b] ? a : b);
    return mostCommonDelimiter;
  }

  extractColumnNames(file) {
    // Check the file type
    const fileType = file.type || '';
    const fileName = file.name || '';
    const fileExt = fileName.split('.').pop().toLowerCase();

    // Set file format based on extension or type
    let fileFormat = 'text';
    if (fileExt === 'xlsx' || fileExt === 'xls' || fileType.includes('excel') || fileType.includes('spreadsheet')) {
      fileFormat = 'excel';
    } else if (fileExt === 'sdf') {
      fileFormat = 'sdf';
    }

    this.setState({ fileFormat });

    switch (fileFormat) {
      case 'excel':
        this.parseExcelFile(file);
        break;
      case 'sdf':
        this.parseSdfFile(file);
        break;
      default:
        this.parseTextFile(file);
    }
  }

  parseExcelFile(file) {
    // Use read-excel-file which works in the browser
    readXlsxFile(file).then((rows) => {
      if (rows.length > 0) {
        // First row contains headers
        const headers = rows[0];

        // Filter out any empty headers
        const columnNames = headers.filter((header) => header && String(header).trim() !== '');

        console.log('Extracted Excel headers:', columnNames);

        this.setState({
          showColumnMapping: true,
          columnNames,
          excelData: rows.slice(1) // Store data rows for later
        });
      } else {
        throw new Error('Excel file appears to be empty');
      }
    }).catch((error) => {
      NotificationActions.add({
        title: 'Error',
        message: `Failed to parse Excel file: ${error.message}`,
        level: 'error',
        dismissible: true,
      });
    });
  }

  parseSdfFile(file) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const fileContent = evt.target.result;
        if (!fileContent) {
          throw new Error('Empty SDF file content');
        }
        
        // Parse SDF content
        console.log('Parsing SDF file...');
        const molecules = parseSdf(fileContent);
        console.log('SDF parsing complete, found molecules:', molecules?.length);

        if (molecules && molecules.length > 0) {
          // Get properties from the first molecule
          const firstMolecule = molecules[0];
          
          // Extract property keys as column names
          const properties = firstMolecule.properties || {};
          console.log('First molecule properties:', Object.keys(properties));
          
          const columnNames = Object.keys(properties);

          // Always include molfile as a column
          if (!columnNames.includes('molfile')) {
            columnNames.unshift('molfile');
          }

          console.log('Extracted SDF properties:', columnNames);

          this.setState({
            showColumnMapping: true,
            columnNames,
            sdfData: molecules // Store molecules for later
          });
        } else {
          throw new Error('No molecules found in SDF file');
        }
      } catch (error) {
        console.error('SDF parsing error:', error);
        NotificationActions.add({
          title: 'Error',
          message: `Failed to parse SDF file: ${error.message}`,
          level: 'error',
          dismissible: true,
        });
      }
    };

    reader.onerror = (error) => {
      console.error('FileReader error for SDF file:', error);
      NotificationActions.add({
        title: 'Error',
        message: 'Failed to read SDF file',
        level: 'error',
        dismissible: true,
      });
    };

    reader.readAsText(file);
  }

  parseTextFile(file) {
    const encoding = ModalImport.getTextFileEncoding(file);
    const reader = new FileReader();
    
    reader.onload = (evt) => {
      try {
        const fileContent = evt.target.result;

        // Check for binary content
        if (ModalImport.containsBinaryContent(fileContent)) {
          NotificationActions.add({
            title: 'Unsupported File Format',
            message: 'This appears to be a binary file. Please use an Excel, CSV, TSV, or SDF file.',
            level: 'error',
            dismissible: true,
          });
          return;
        }

        // Parse the file content to extract header row
        // Detect delimiter (tab, comma, etc.)
        const delimiter = ModalImport.detectDelimiter(fileContent);
        const lines = fileContent.split(/\r?\n/);

        if (lines.length > 0) {
          // Get the first line and split by detected delimiter
          const headers = lines[0].split(delimiter);

          // Filter out any empty headers
          const columnNames = headers
            .map((header) => header.trim())
            .filter((header) => header !== '');

          console.log('Extracted text file headers:', columnNames);
          console.log('Using delimiter:', delimiter === '\t' ? 'Tab' : delimiter);

          this.setState({
            showColumnMapping: true,
            columnNames,
            fileDelimiter: delimiter
          });
        } else {
          throw new Error('File appears to be empty');
        }
      } catch (error) {
        NotificationActions.add({
          title: 'Error',
          message: `Failed to parse file: ${error.message}. Please ensure it is a valid format.`,
          level: 'error',
          dismissible: true,
        });
      }
    };

    reader.onerror = () => {
      NotificationActions.add({
        title: 'Error',
        message: 'Failed to read the file. Please try again or use a different file.',
        level: 'error',
        dismissible: true,
      });
    };

    reader.readAsText(file, encoding);
  }

  static getTextFileEncoding(file) {
    // Basic encoding detection logic
    // In a real-world app, you might want to use a more robust library
    return 'utf-8';
  }

  // Method to generate column definitions for AG Grid
  generateColumnDefs(mappedColumns) {
    return Object.entries(mappedColumns)
      .filter(([, mappedCol]) => mappedCol !== 'do_not_import')
      .map(([originalCol, mappedCol]) => ({
        field: mappedCol,
        headerName: originalCol,
        editable: true
      }));
  }

  dropzoneOrfilePreview() {
    const { file, importAsChemical, importWithColumnMapping } = this.state;
    if (file) {
      return (
        <div className="d-flex justify-content-between">
          {file.name}
          <Button size="sm" variant="danger" onClick={() => this.handleAttachmentRemove()}>
            <i className="fa fa-trash-o" />
          </Button>
        </div>
      );
    }
    return (
      <>
        <Dropzone
          onDrop={(attachmentFile) => this.handleFileDrop(attachmentFile)}
          style={{ height: 50, width: '100%', border: '3px dashed lightgray' }}
          accept=".csv,.tsv,.txt,.xlsx,.xls,.sdf"
        >
          <div style={{ textAlign: 'center', paddingTop: 12, color: 'gray' }}>
            Drop File, or Click to Select. (Supported formats: CSV, TSV, Excel, SDF)
          </div>
        </Dropzone>
        <div style={{ paddingTop: 12 }}>
          <Form.Check
            id="modal-check-import-as-chemical"
            type="checkbox"
            onChange={() => this.setState((prevState) => ({ importAsChemical: !prevState.importAsChemical }))}
            label="Import as a chemical inventory"
            checked={importAsChemical}
            className="me-2"
          />
        </div>
        <div>
          <Form.Check
            id="modal-check-import-as-column-mapping"
            type="checkbox"
            onChange={() => this.setState((prevState) => (
              {
                importWithColumnMapping: !prevState.importWithColumnMapping
              }
            ))}
            label="Import with column mapping and validation"
            checked={importWithColumnMapping}
            className="me-2"
          />
        </div>
      </>
    );
  }

  isDisabled() {
    const { file } = this.state;
    return file == null;
  }

  // Add extractDataFromExcel method back with improved error handling
  extractDataFromExcel(excelData, mappedColumns) {
    if (!excelData || !excelData.length) {
      console.warn('No Excel data available for extraction');
      return [];
    }

    try {
      const rowData = [];
      const { columnNames } = this.state;

      if (!columnNames || columnNames.length === 0) {
        console.error('Column names not available');
        throw new Error('Column names not available for processing Excel data');
      }

      // Map Excel columns to their indices for faster lookup
      const columnIndices = {};
      columnNames.forEach((colName, index) => {
        columnIndices[colName] = index;
      });

      // Process each row of data
      excelData.forEach((row, rowIndex) => {
        if (row && row.some((cell) => cell !== null && cell !== '')) {
          const dataRow = { id: rowIndex + 1, valid: true };

          // Map values to their corresponding column names
          Object.entries(mappedColumns).forEach(([originalCol, mappedCol]) => {
            if (mappedCol !== 'do_not_import') {
              const colIndex = columnIndices[originalCol];
              
              if (colIndex !== undefined && colIndex < row.length) {
                const cellValue = row[colIndex];
                dataRow[mappedCol] = cellValue !== null && cellValue !== undefined 
                  ? String(cellValue).trim() 
                  : '';
              }
            }
          });

          rowData.push(dataRow);
        }
      });

      console.log(`Extracted ${rowData.length} data rows from Excel`);
      return rowData;
    } catch (error) {
      console.error('Error extracting data from Excel:', error);
      throw new Error(`Excel data extraction failed: ${error.message}`);
    }
  }

  // Helper method to convert column names to field names (snake_case)
  static convertToFieldName(columnName) {
    if (!columnName) return '';
    // Remove '(decoupled)' text
    const cleanName = columnName.replace(/\s*\(decoupled\)\s*/g, '');
    // Convert to snake_case: lowercase, replace spaces with underscores
    return cleanName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, ''); // Remove any characters that aren't letters, numbers, or underscores
  }

  render() {
    const { onHide } = this.props;
    const {
      importWithColumnMapping,
      importAsChemical,
      showColumnMapping,
      showValidation,
      columnNames,
      rowData,
      columnDefs,
      isProcessing
    } = this.state;
    const importButtonText = importWithColumnMapping ? 'Map Columns and Validate Data' : 'Import';
    return (
      <Modal show onHide={onHide}>
        <Modal.Header closeButton>
          <Modal.Title>
            {importAsChemical
              ? 'Import Chemicals from File'
              : 'Import Samples from File'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {this.dropzoneOrfilePreview()}
          {importWithColumnMapping && showColumnMapping && (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {isProcessing && (
                <div className="text-center my-3">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Processing data, please wait...</p>
                </div>
              )}
              <ColumnMappingComponent
                columnNames={columnNames || []}
                modelName={importAsChemical ? 'chemical' : 'sample'}
                onValidate={(columns) => this.handleColumnMappingValidation(columns)}
                convertToFieldName={ModalImport.convertToFieldName}
                disabled={isProcessing}
              />
            </div>
          )}
          {showValidation && (
            <ValidationComponent
              rowData={rowData || []}
              columnDefs={columnDefs || []}
              onValidate={(invalidRows) => this.handleValidation(invalidRows)}
              onCancel={(updatedRowData) => this.handleCancelValidation(updatedRowData)}
            />
          )}
          <ButtonToolbar className="justify-content-end mt-2 gap-1">
            <Button variant="primary" onClick={() => onHide()}>Cancel</Button>
            <Button
              variant="warning"
              onClick={() => this.handleClick()}
              disabled={this.isDisabled() || isProcessing}
            >
              {importButtonText}
            </Button>
          </ButtonToolbar>
        </Modal.Body>
      </Modal>
    );
  }
}

ModalImport.propTypes = {
  onHide: PropTypes.func.isRequired,
};
