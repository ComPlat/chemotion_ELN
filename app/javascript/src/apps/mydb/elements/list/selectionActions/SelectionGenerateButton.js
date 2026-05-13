import React from 'react';
import { Dropdown } from 'react-bootstrap';
import PrintCodeFetcher from 'src/fetchers/PrintCodeFetcher';
import UIStore from 'src/stores/alt/stores/UIStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import MatrixCheck from 'src/components/common/MatrixCheck';
import UserStore from 'src/stores/alt/stores/UserStore';
import { PDFDocument } from 'pdf-lib';
import Utils from 'src/utilities/Functions';
import 'whatwg-fetch';

// Element types accepted by the /api/v1/code_logs/print_codes endpoint
// (see app/api/chemotion/code_log_api.rb).
const PRINTABLE_ELEMENT_TYPES = [
  'sample',
  'reaction',
  'wellplate',
  'screen',
  'device_description',
  'sequence_based_macromolecule_sample',
];

export default class SelectionGenerateButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // Map of element type -> Immutable.List of checked IDs, including every
      // printable type with at least one selection (selections persist across
      // tab switches in UIStore, so the user may have selections on multiple
      // tabs simultaneously — print all of them).
      selectionsByType: {},
      json: {},
      matrix: null,
      enableComputedProps: null,
      enableReactionPredict: null,
    };

    this.syncFromStores = this.syncFromStores.bind(this);
    this.onUIStoreChange = this.onUIStoreChange.bind(this);
    this.onUserStoreChange = this.onUserStoreChange.bind(this);
    this.downloadPrintCodesPDF = this.downloadPrintCodesPDF.bind(this);
  }

  async componentDidMount() {
    UIStore.listen(this.onUIStoreChange);
    UserStore.listen(this.onUserStoreChange);
    this.onUserStoreChange(UserStore.getState());
    this.syncFromStores();

    // Import the PDF configuration when the component mounts
    try {
      const response = await fetch('/json/printingConfig/defaultConfig.json');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const tmpJson = await response.json();
      this.setState({ json: tmpJson });
    } catch (err) {
      console.error('Failed to fetch JSON', err);
    }
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIStoreChange);
    UserStore.unlisten(this.onUserStoreChange);
  }

  onUIStoreChange() {
    this.syncFromStores();
  }

  onUserStoreChange(state) {
    const { matrix: storeMatrix } = state?.currentUser || {};
    const { matrix } = this.state;
    if (matrix !== storeMatrix) {
      this.setState({
        matrix: storeMatrix,
        enableComputedProps: MatrixCheck(storeMatrix, 'computedProp'),
        enableReactionPredict: MatrixCheck(storeMatrix, 'reactionPrediction'),
      });
    }
  }

  // Collects checked IDs for every printable element type from UIStore so we
  // can print labels for selections across all tabs in one go.
  syncFromStores() {
    const uiState = UIStore.getState() || {};
    const next = {};
    let changed = false;
    const { selectionsByType: prev } = this.state;

    PRINTABLE_ELEMENT_TYPES.forEach((t) => {
      const ids = uiState[t]?.checkedIds;
      if (ids && ids.size > 0) {
        next[t] = ids;
        if (prev[t] !== ids) changed = true;
      } else if (prev[t]) {
        changed = true;
      }
    });

    if (changed || Object.keys(next).length !== Object.keys(prev).length) {
      this.setState({ selectionsByType: next });
    }
  }

  async downloadPrintCodesPDF(selectedConfig) {
    const { json, selectionsByType } = this.state;
    const configParams = json[selectedConfig] || {};
    const baseQuery = Object.entries(configParams)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    const requests = [];
    Object.entries(selectionsByType).forEach(([elementType, idsList]) => {
      idsList.forEach((id) => {
        const params = `element_type=${elementType}&ids[]=${id}`;
        const url = baseQuery
          ? `/api/v1/code_logs/print_codes?${params}&${baseQuery}`
          : `/api/v1/code_logs/print_codes?${params}`;
        requests.push(url);
      });
    });

    if (requests.length === 0) return;

    try {
      const mergedPdf = await PDFDocument.create();
      const pdfPromises = requests.map(async (url) => {
        const pdfBytes = await PrintCodeFetcher.fetchMergedPrintCodes(url);
        const pdfToMerge = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      });

      await Promise.all(pdfPromises);
      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      Utils.downloadFile({ contents: url, name: 'print_codes_merged.pdf' });
    } catch (err) {
      console.error('Failed to generate print codes PDF', err);
    }
  }

  render() {
    const {
      json, selectionsByType, enableComputedProps, enableReactionPredict
    } = this.state;
    const totalSelected = Object.values(selectionsByType)
      .reduce((sum, list) => sum + list.size, 0);
    const disabledPrint = totalSelected === 0;
    const pdfMenuItems = Object.entries(json).map(([key]) => ({ key, name: key }));

    return (
      <Dropdown id="selection-generate-button">
        <Dropdown.Toggle variant="light" size="sm" title="Reporting" aria-label="Reporting">
          <i className="fa fa-caret-square-o-right me-1" aria-hidden="true" />
          <span className="selection-action-text-label">Reporting</span>
        </Dropdown.Toggle>

        <Dropdown.Menu>
          {/* PDF Generation Items */}
          {pdfMenuItems.map((e) => (
            <Dropdown.Item
              key={e.key}
              disabled={disabledPrint}
              onClick={(event) => {
                event.stopPropagation();
                if (!disabledPrint) {
                  this.downloadPrintCodesPDF(e.name);
                }
              }}
            >
              {e.name}
            </Dropdown.Item>
          ))}

          {/* Separator between PDF and Report functions */}
          {pdfMenuItems.length > 0 && (
            <Dropdown.Divider />
          )}

          {/* Report Utility Items */}
          <Dropdown.Item onClick={ElementActions.showReportDetails} title="Report">
            Report
          </Dropdown.Item>

          <Dropdown.Divider />

          <Dropdown.Item onClick={ElementActions.showFormatContainer} title="Analyses Formatting">
            Format Analyses
          </Dropdown.Item>

          {enableComputedProps && (
            <>
              <Dropdown.Item onClick={ElementActions.showComputedPropsGraph} title="Graph">
                Computed Props Graph
              </Dropdown.Item>
              <Dropdown.Item onClick={ElementActions.showComputedPropsTasks} title="Tasks">
                Computed Props Tasks
              </Dropdown.Item>
            </>
          )}

          {enableReactionPredict && (
            <>
              <Dropdown.Divider />
              <Dropdown.Item onClick={ElementActions.showPredictionContainer} title="Predict">
                Synthesis Prediction
              </Dropdown.Item>
            </>
          )}
        </Dropdown.Menu>
      </Dropdown>
    );
  }
}
