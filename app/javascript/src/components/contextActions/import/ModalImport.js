import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, ButtonToolbar, Form, Modal, Dropdown
} from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import UIStore from 'src/stores/alt/stores/UIStore';
import readXlsxFile, { readSheetNames } from 'read-excel-file';
import { parse as parseSdf } from 'sdf-parser';

import ElementActions from 'src/stores/alt/actions/ElementActions';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import ColumnMappingComponent from 'src/components/contextActions/ColumnMappingComponent';
import ValidationComponent from 'src/components/contextActions/ValidationComponent';

export default class ModalImport extends React.Component {
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
          let currentRow = null;
          let isMolfile = false;

          lines.slice(1).forEach((line, idx) => {
            // Detect the start of a new row
            if (!isMolfile && line.trim() !== '' && !line.startsWith('M  END')) {
              const values = line.split(delimiter);
              currentRow = { id: idx + 1, valid: true };

              // Map values to their corresponding column names
              Object.entries(columnMap).forEach(([indexStr, columnName]) => {
                const index = parseInt(indexStr, 10);
                if (!Number.isNaN(index) && index < values.length) {
                  currentRow[columnName] = values[index] ? values[index].trim() : '';
                }
              });

              rowData.push(currentRow);

              // Check if the molfile field exists in the row
              if (currentRow.molfile !== undefined) {
                isMolfile = true;
                currentRow.molfile = '';
              }
            } else if (isMolfile) {
              // Append multiline molfile content exactly as it appears
              const delimiterIndex = line.indexOf(delimiter);
              if (delimiterIndex !== -1) {
                // Stop appending to molfile and process the remaining line as the next column value
                currentRow.molfile += `${line.substring(0, delimiterIndex)}\n`;
                const remainingValues = line.substring(delimiterIndex + 1).split(delimiter);

                // Find the position of the molfile column in the columnMap
                const molfileIndex = Object.keys(columnMap).find((key) => columnMap[key] === 'molfile');

                // Map remaining values starting from the column after molfile
                Object.entries(columnMap).forEach(([indexStr, columnName]) => {
                  const index = parseInt(indexStr, 10);
                  if (!Number.isNaN(index) && index > molfileIndex
                    && index - molfileIndex - 1 < remainingValues.length) {
                    currentRow[columnName] = remainingValues[index - molfileIndex - 1]
                      ? remainingValues[index - molfileIndex - 1].trim() : '';
                  }
                });
                isMolfile = false;
              } else {
                currentRow.molfile += `${line}\n`;
              }
            }
          });
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
    // eslint-disable-next-line no-control-regex
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
    const mostCommonDelimiter = delimiters.reduce(
      (a, b) => (counts[a] > counts[b] ? a : b)
    );
    return mostCommonDelimiter;
  }

  // Method to generate column definitions for AG Grid
  static generateColumnDefs(mappedColumns) {
    const columnDefs = Object.entries(mappedColumns)
      .filter(([, mappedCol]) => mappedCol !== 'do_not_import')
      .map(([, mappedCol]) => ({
        field: mappedCol, // Use the mapped column name as field
        headerName: mappedCol, // Use the mapped column as header
        editable: true
      }));
    return columnDefs;
  }

  // Helper method to convert column names to field names (snake_case)
  static convertToFieldName(columnName) {
    if (!columnName) return '';
    // Convert to snake_case: lowercase, replace spaces with underscores
    return columnName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z_]/g, ''); // Remove any characters that aren't letters, or underscores
  }

  static downloadTemplate(type) {
    // Map of template types to their file paths and names
    const templates = {
      // Sample templates
      sample_xlsx_template: {
        path: '/xlsx/sample_import_template_01.xlsx',
        filename: 'sample_import_template_01.xlsx'
      },
      sample_xlsx_example: {
        path: '/xlsx/sample_import_example.xlsx',
        filename: 'sample_import_example.xlsx'
      },
      sample_sdf_template: {
        path: '/sdf/sample_import_template.sdf',
        filename: 'sample_import_template.sdf'
      },
      sample_sdf_example: {
        path: '/sdf/sample_import_example.sdf',
        filename: 'sample_import_example.sdf'
      },
      sample_csv_template: {
        path: '/csv/sample_import_template.csv',
        filename: 'sample_import_template.csv'
      },
      sample_tsv_template: {
        path: '/tsv/sample_import_template.tsv',
        filename: 'sample_import_template.tsv'
      },

      // Chemical templates
      chemical_xlsx_template: {
        path: '/xlsx/chemical_import_template.xlsx',
        filename: 'chemical_import_template.xlsx'
      },
      chemical_xlsx_example: {
        path: '/xlsx/chemical_import_example.xlsx',
        filename: 'chemical_import_example.xlsx'
      },
      chemical_sdf_template: {
        path: '/sdf/chemical_import_template.sdf',
        filename: 'chemical_import_template.sdf'
      },
      chemical_sdf_example: {
        path: '/sdf/chemical_import_example.sdf',
        filename: 'chemical_import_example.sdf'
      }
    };

    // Get template info
    const template = templates[type];

    if (!template) {
      NotificationActions.add({
        title: 'Template Error',
        message: `Template "${type}" not found. Please contact support.`,
        level: 'error',
        dismissible: true,
      });
      return;
    }

    const link = document.createElement('a');
    link.href = template.path;
    link.download = template.filename;

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
  }

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
      isProcessing: false,
      mappedColumns: null,
      showCancelConfirmation: false,
    };
  }

  static getTextFileEncoding() {
    // Basic encoding detection logic
    return 'utf-8';
  }

  handleClick() {
    const { onHide } = this.props;
    const {
      file,
      importAsChemical,
      importWithColumnMapping,
      showColumnMapping,
      mappedColumns
    } = this.state;
    const uiState = UIStore.getState();
    const params = {
      file,
      currentCollectionId: uiState.currentCollection.id,
      type: importAsChemical ? 'chemical' : 'sample',
    };

    if (showColumnMapping) {
      this.handleColumnMappingValidation(mappedColumns);
    } else if (importWithColumnMapping) {
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
    this.setState({
      file: null,
      showColumnMapping: false,
      showValidation: false,
      mappedColumns: null,
    });
  }

  handleValidation(invalidRows, rowsData) {
    if (invalidRows.length > 0) {
      // if some rows have validation errors, show notification but keep the modal open
      NotificationActions.add({
        title: 'Validation Error',
        message: `Found ${invalidRows.length} invalid rows. Please correct them before importing.`,
        level: 'error',
        dismissible: true,
      });
    } else {
      // Get the current valid data from the grid
      const validData = rowsData.filter((row) => !row.delete && (row.valid !== false));

      // Prepare data for backend
      const cleanedData = validData.map((row) => {
        const cleanRow = { ...row };
        if (cleanRow.molfile !== undefined && cleanRow.molfile !== null) {
          cleanRow.molfile = `\n${cleanRow.molfile}\n`;
        }
        // Remove UI-specific properties
        delete cleanRow.id;
        delete cleanRow.valid;
        delete cleanRow.errors;
        delete cleanRow.delete;
        return cleanRow;
      });

      this.setState({ rowData: cleanedData });
    }
  }

  handleImportData() {
    const { onHide } = this.props;
    const { importAsChemical, fileFormat, rowData } = this.state;
    const uiState = UIStore.getState();
    // For Excel and other formats, send the cleaned data directly
    const params = {
      currentCollectionId: uiState.currentCollection.id,
      type: importAsChemical ? 'chemical' : 'sample',
      data: rowData,
      originalFormat: fileFormat
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

  async handleColumnMappingValidation(mappedColumns) {
    this.setState({ isProcessing: true });
    let message;
    try {
      // Validate mappedColumns
      // Check if at least one column is being imported
      const importingColumns = mappedColumns && Object.values(mappedColumns).filter(
        (value) => value !== 'do_not_import'
      );

      if (!mappedColumns || Object.keys(mappedColumns).length === 0 || importingColumns.length === 0) {
        message = 'Please map at least one column to import';
        this.setState({ isProcessing: false });
        NotificationActions.add({
          title: 'Validation Error',
          message,
          level: 'error',
          dismissible: true,
        });
        return;
      }

      // Check for duplicate mapped columns
      const { hasDuplicates, duplicateKeys } = this.checkForDuplicateMappedColumns(mappedColumns);
      if (hasDuplicates) {
        const duplicateMsg = `Duplicate mapped columns found: ${duplicateKeys.join(', ')}. `
          + 'Please ensure each field is mapped only once.';
        this.setState({ isProcessing: false });
        NotificationActions.add({
          title: 'Duplicate Mappings',
          message: duplicateMsg,
          level: 'error',
          dismissible: true,
        });
        return;
      }

      // Extract the actual data from the file based on the mapped columns
      const mappedRowData = await this.extractDataFromFile(mappedColumns);

      if (!mappedRowData || !Array.isArray(mappedRowData) || mappedRowData.length === 0) {
        throw new Error('No data could be extracted from the file with the current column mapping');
      }

      // Ensure each row has a unique ID for proper tracking in the grid
      const rowDataWithIds = mappedRowData.map((row, index) => ({
        ...row,
        id: row.id || index + 1,
        valid: true
      }));

      const columnDefs = ModalImport.generateColumnDefs(mappedColumns);

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
        message: message || `Failed to extract data from file for validation: ${error.message}`,
        level: 'error',
        dismissible: true,
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

  // Helper function to check if there are duplicate mapped columns
  // eslint-disable-next-line class-methods-use-this
  checkForDuplicateMappedColumns(mappedColumns) {
    if (!mappedColumns) {
      return { hasDuplicates: false, duplicateKeys: [] };
    }

    // Skip 'do_not_import' values
    const mappedValues = Object.entries(mappedColumns)
      .filter(([, value]) => value !== 'do_not_import')
      .map(([, value]) => value);

    // Find duplicates using a Set
    const uniqueValues = new Set();
    const duplicates = new Set();

    mappedValues.forEach((value) => {
      if (uniqueValues.has(value)) {
        duplicates.add(value);
      } else {
        uniqueValues.add(value);
      }
    });

    const duplicateKeys = Array.from(duplicates);
    return {
      hasDuplicates: duplicateKeys.length > 0,
      duplicateKeys
    };
  }

  extractDataFromExcel(excelData, mappedColumns) {
    if (!excelData || !excelData.length) {
      console.warn('No Excel data available for extraction');
      return [];
    }

    try {
      const rowData = [];
      const { columnNames } = this.state;

      if (!columnNames || columnNames.length === 0) {
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

      return rowData;
    } catch (error) {
      console.error('Error extracting data from Excel:', error);
      throw new Error(`Excel data extraction failed: ${error.message}`);
    }
  }

  extractDataFromSDF(sdfData, mappedColumns) {
    if (!sdfData || !sdfData.length) {
      console.warn('No SDF data available for extraction');
      return [];
    }

    try {
      const rowData = [];
      const { columnNames } = this.state;

      if (!columnNames || columnNames.length === 0) {
        throw new Error('Column names not available for processing SDF data');
      }
      // Process each molecule (which is now a full object, not an array)
      sdfData.forEach((molecule, index) => {
        if (!molecule) {
          console.warn(`Skipping empty molecule at index ${index}`);
          return; // Skip this iteration
        }

        const dataRow = { id: index + 1, valid: true };

        // Map values to their corresponding mapped field names
        Object.entries(mappedColumns).forEach(([originalCol, mappedCol]) => {
          if (mappedCol !== 'do_not_import') {
            // Get the actual property from the molecule object
            // For SDF files, properties are direct properties of the molecule object
            if (originalCol === 'molfile' && molecule.molfile) {
              // Special handling for molfile
              dataRow[mappedCol] = molecule.molfile || '';
            } else if (molecule[originalCol] !== undefined) {
              // Regular property
              const value = molecule[originalCol];
              dataRow[mappedCol] = value !== null && value !== undefined
                ? String(value).trim()
                : '';
            }
          }
        });

        // Only add rows that have actual mapped data (more than just ID)
        if (Object.keys(dataRow).length > 1) {
          rowData.push(dataRow);
        }
      });
      return rowData;
    } catch (error) {
      console.error('Error extracting data from SDF:', error);
      throw new Error(`SDF data extraction failed: ${error.message}`);
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
      // Handle different file formats
      switch (fileFormat) {
        case 'excel':
          return this.extractDataFromExcel(excelData, mappedColumns);
        case 'sdf':
          return this.extractDataFromSDF(sdfData, mappedColumns);
        default:
          return ModalImport.extractDataFromText(file, fileDelimiter, mappedColumns);
      }
    } catch (error) {
      console.error('Error in extractDataFromFile:', error);
      throw new Error(`Data extraction failed for ${fileFormat} format: ${error.message}`);
    }
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

  async parseExcelFile(file) {
    // Use read-excel-file which works in the browser
    // First get sheet names to check for 'sample' or 'sample_chemicals' sheets
    try {
      let rows;
      try {
        const sheetNames = await readSheetNames(file);
        // Determine which sheet to use (matching import_samples.rb logic)
        if (sheetNames.includes('sample')) {
          rows = await readXlsxFile(file, { sheet: 'sample' });
        } else if (sheetNames.includes('sample_chemicals')) {
          rows = await readXlsxFile(file, { sheet: 'sample_chemicals' });
        } else {
          // If neither sheet exists, read the first sheet (default behavior)
          rows = await readXlsxFile(file);
        }
      } catch (sheetError) {
        // Fallback: if sheet detection fails, just read the file normally
        rows = await readXlsxFile(file);
      }

      if (rows.length > 0) {
        // First row contains headers
        const headers = rows[0];

        // Filter out any empty headers
        const columnNames = headers.filter((header) => header && String(header).trim() !== '');

        this.setState({
          showColumnMapping: true,
          columnNames,
          excelData: rows.slice(1) // Store data rows for later
        });
      } else {
        throw new Error('Excel file appears to be empty');
      }
    } catch (error) {
      NotificationActions.add({
        title: 'Error',
        message: `Failed to parse Excel file: ${error.message}`,
        level: 'error',
        dismissible: true,
      });
    }
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
        const parsedData = parseSdf(fileContent);
        const molecules = parsedData.molecules || [];

        if (!molecules || molecules.length === 0) {
          throw new Error('No molecules found in SDF file');
        }

        const firstMolecule = molecules[0];
        // Find the molecule with the most properties to use for column mapping
        const largestMolecule = molecules.reduce((result, molecule) => {
          if (!molecule) return result;

          const keys = Object.keys(molecule);
          if (!result || (keys.length > Object.keys(result).length)) {
            return molecule;
          }
          return result;
        }, null);

        // Use the molecule with the most properties for column extraction
        const moleculeToUse = largestMolecule || firstMolecule;

        // Ensure molecule is an object
        if (!moleculeToUse || typeof moleculeToUse !== 'object') {
          throw new Error('Invalid molecule format in SDF file');
        }

        // Extract property keys as column names - filter out non-string properties
        const columnNames = Object.keys(moleculeToUse).filter((key) => (
          typeof moleculeToUse[key] === 'string'
          || moleculeToUse[key] === null
          || moleculeToUse[key] === undefined
        ));

        // Always include molfile as a column
        if (!columnNames.includes('molfile')) {
          columnNames.unshift('molfile');
        }

        // Store the original molecule objects directly
        const sdfData = molecules.filter((molecule) => molecule && typeof molecule === 'object');

        if (sdfData.length === 0) {
          NotificationActions.add({
            title: 'Error',
            message: 'No valid molecule data could be extracted from the SDF file',
            level: 'error',
            dismissible: true,
          });
        }

        this.setState({
          showColumnMapping: true,
          columnNames,
          sdfData
        });
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

  confirmCancelValidation() {
    // Do not preserve data when returning to column mapping
    this.setState({
      rowData: [],
      showValidation: false,
      showColumnMapping: true,
      showCancelConfirmation: false,
    });
  }

  dismissCancelConfirmation() {
    // Close the confirmation modal without taking action
    this.setState({
      showCancelConfirmation: false,
    });
  }

  dropzoneOrfilePreview() {
    const { file, importAsChemical, importWithColumnMapping } = this.state;
    return (
      <>
        {file ? (
          <div className="d-flex justify-content-between p-2 border rounded bg-light">
            <span className="p-1">{file.name}</span>
            <Button size="sm" variant="danger" onClick={() => this.handleAttachmentRemove()}>
              <i className="fa fa-trash-o" />
            </Button>
          </div>
        ) : (
          <Dropzone
            onDrop={(attachmentFile) => this.handleFileDrop(attachmentFile)}
            style={{ height: 50, width: '100%', border: '3px dashed lightgray' }}
            accept=".csv,.tsv,.txt,.xlsx,.xls,.sdf"
          >
            <div style={{ textAlign: 'center', paddingTop: 12, color: 'gray' }}>
              Drop File, or Click to Select. (Supported formats: CSV, TSV, Excel, SDF)
            </div>
          </Dropzone>
        )}

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
            label="Import with column mapping and data validation"
            checked={importWithColumnMapping}
            className="me-2"
          />
        </div>

        <div className="pt-3">
          <Dropdown>
            <Dropdown.Toggle variant="info" size="sm" id="dropdown-templates">
              <i className="fa fa-download me-1" />
              Download Template
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Header>Sample Templates</Dropdown.Header>
              <Dropdown.Item onClick={() => ModalImport.downloadTemplate('sample_xlsx_template')}>
                Sample - Empty XLSX Template
              </Dropdown.Item>
              <Dropdown.Item onClick={() => ModalImport.downloadTemplate('sample_xlsx_example')}>
                Sample - XLSX with Example Data
              </Dropdown.Item>
              <Dropdown.Item onClick={() => ModalImport.downloadTemplate('sample_sdf_template')}>
                Sample - Empty SDF Template
              </Dropdown.Item>
              <Dropdown.Item onClick={() => ModalImport.downloadTemplate('sample_sdf_example')}>
                Sample - SDF with Example Data
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Header>Additional Sample Templates</Dropdown.Header>
              <Dropdown.Item onClick={() => ModalImport.downloadTemplate('sample_csv_template')}>
                Sample - CSV with Example Data
              </Dropdown.Item>
              <Dropdown.Item onClick={() => ModalImport.downloadTemplate('sample_tsv_template')}>
                Sample - TSV with Example Data
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Header>Chemical Templates</Dropdown.Header>
              <Dropdown.Item onClick={() => ModalImport.downloadTemplate('chemical_xlsx_template')}>
                Chemical - Empty XLSX Template
              </Dropdown.Item>
              <Dropdown.Item onClick={() => ModalImport.downloadTemplate('chemical_xlsx_example')}>
                Chemical - XLSX with Example Data
              </Dropdown.Item>
              <Dropdown.Item onClick={() => ModalImport.downloadTemplate('chemical_sdf_template')}>
                Chemical - Empty SDF Template
              </Dropdown.Item>
              <Dropdown.Item onClick={() => ModalImport.downloadTemplate('chemical_sdf_example')}>
                Chemical - SDF with Example Data
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </>
    );
  }

  isDisabled() {
    const { file } = this.state;
    return file == null;
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
      isProcessing,
      mappedColumns,
      showCancelConfirmation
    } = this.state;
    let importButtonText;
    if (showColumnMapping) {
      importButtonText = 'Proceed to validate Data';
    } else if (importWithColumnMapping) {
      importButtonText = 'Map Columns and Validate Data';
    } else {
      importButtonText = 'Import';
    }
    return (
      <>
        <style>{'.modal-import-dialog{min-width:550px;}'}</style>
        <Modal show onHide={onHide} dialogClassName="modal-import-dialog">
          <Modal.Header closeButton>
            <Modal.Title>
              Import samples from file
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
                  disabled={isProcessing}
                  initialMappedColumns={mappedColumns}
                  onMappedColumnsChange={(columns) => this.setState({ mappedColumns: columns })}
                />
              </div>
            )}
            {showValidation && (
              <ValidationComponent
                rowData={rowData || []}
                onRowDataChange={(data) => this.setState({ rowData: data })}
                columnDefs={columnDefs || []}
                onValidate={(invalidRows, rowsData) => this.handleValidation(invalidRows, rowsData)}
                onImport={() => this.handleImportData()}
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

          {/* Validation Cancellation Confirmation Modal */}
          <Modal
            show={showCancelConfirmation}
            onHide={() => this.dismissCancelConfirmation()}
            backdrop="static"
            keyboard={false}
            size="md"
            centered
            dialogClassName="confirmation-modal-wider"
          >
            <Modal.Header>
              <Modal.Title as="h5">Confirm Cancellation</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div className="d-flex align-items-center mb-3">
                <i className="fa fa-exclamation-triangle text-warning me-2" style={{ fontSize: '1.5rem' }} />
                <p className="mb-0">
                  Any edits made during validation will not be preserved.
                </p>
              </div>
              <p className="text-muted small">
                Cancelling validation will return you to the column mapping screen.
              </p>
            </Modal.Body>
            <Modal.Footer className="d-flex flex-row justify-content-between">
              <Button variant="primary" onClick={() => this.dismissCancelConfirmation()}>
                Continue Validation
              </Button>
              <Button variant="secondary" onClick={() => this.confirmCancelValidation()}>
                Return to Column Mapping
              </Button>
            </Modal.Footer>
          </Modal>
        </Modal>
      </>
    );
  }
}

ModalImport.propTypes = {
  onHide: PropTypes.func.isRequired,
};
