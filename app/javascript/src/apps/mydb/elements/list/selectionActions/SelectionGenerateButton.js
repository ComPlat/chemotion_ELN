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
      // Snapshot of ui_state per printable element type that has any active
      // selection ({checkedAll, checkedIds, uncheckedIds}). Mirrors UIStore so
      // we can build the ui_state payload that the print_codes_by_ui_state
      // endpoint expects.
      selectionsByType: {},
      currentCollection: null,
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

  // Collects ui_state per printable element type from UIStore so we can print
  // labels for selections across all tabs (including "All pages" via
  // checkedAll) in a single batch.
  syncFromStores() {
    const uiState = UIStore.getState() || {};
    const next = {};

    PRINTABLE_ELEMENT_TYPES.forEach((t) => {
      const typeState = uiState[t];
      if (!typeState) return;
      const hasSelection = typeState.checkedAll
        || (typeState.checkedIds && typeState.checkedIds.size > 0);
      if (!hasSelection) return;
      next[t] = {
        checkedAll: !!typeState.checkedAll,
        checkedIds: typeState.checkedIds ? typeState.checkedIds.toArray() : [],
        uncheckedIds: typeState.uncheckedIds ? typeState.uncheckedIds.toArray() : [],
      };
    });

    this.setState({
      selectionsByType: next,
      currentCollection: uiState.currentCollection || null,
    });
  }

  async downloadPrintCodesPDF(selectedConfig) {
    const { json, selectionsByType, currentCollection } = this.state;
    if (!currentCollection || Object.keys(selectionsByType).length === 0) return;

    const configParams = json[selectedConfig] || {};

    try {
      const mergedPdf = await PDFDocument.create();
      const requests = Object.entries(selectionsByType).map(([elementType, selection]) => {
        const payload = {
          element_type: elementType,
          ui_state: {
            checkedAll: selection.checkedAll,
            checkedIds: selection.checkedIds,
            uncheckedIds: selection.uncheckedIds,
            collection_id: currentCollection.id,
            is_sync_to_me: !!currentCollection.is_sync_to_me,
          },
          ...configParams,
        };
        return PrintCodeFetcher.fetchPrintCodesByUIState(payload);
      });

      const pdfBuffers = await Promise.all(requests);
      // Append each PDF sequentially — mergedPdf mutations aren't safe to
      // interleave even though JS is single-threaded, because copyPages and
      // addPage share internal state on the merged document.
      await pdfBuffers.reduce(async (chain, pdfBytes) => {
        await chain;
        if (!pdfBytes || pdfBytes.byteLength === 0) return;
        const pdfToMerge = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }, Promise.resolve());

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
      json, selectionsByType, currentCollection,
      enableComputedProps, enableReactionPredict,
    } = this.state;
    const hasSelection = Object.keys(selectionsByType).length > 0;
    const disabledPrint = !currentCollection || !hasSelection;
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
