import React from 'react';
import { List } from 'immutable';
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
      checkedIds: List(),
      elementType: null,
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
    this.syncFromStores();
  }

  // Picks the active element type from UserStore (the currently selected tab)
  // and reads the matching checkedIds from UIStore. Scanning UIStore for the
  // first non-empty selection instead would pick up stale selections left
  // over from other tabs.
  syncFromStores() {
    const { currentType } = UserStore.getState() || {};
    const uiState = UIStore.getState() || {};
    const isPrintable = PRINTABLE_ELEMENT_TYPES.includes(currentType);
    const typeState = isPrintable ? uiState[currentType] : null;
    const nextCheckedIds = (typeState && typeState.checkedIds) || List();
    const nextElementType = isPrintable ? currentType : null;

    const { checkedIds, elementType } = this.state;
    if (nextCheckedIds !== checkedIds || nextElementType !== elementType) {
      this.setState({
        checkedIds: nextCheckedIds,
        elementType: nextElementType,
      });
    }
  }

  async downloadPrintCodesPDF(ids, selectedConfig) {
    const { json, elementType } = this.state;
    if (!elementType || !ids || ids.length === 0) return;

    const configParams = json[selectedConfig] || {};

    try {
      const mergedPdf = await PDFDocument.create();
      const pdfPromises = ids.map(async (id) => {
        let url = `/api/v1/code_logs/print_codes?element_type=${elementType}&ids[]=${id}`;
        Object.entries(configParams).forEach(([key, value]) => {
          url += `&${key}=${value}`;
        });
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
      json, checkedIds, elementType, enableComputedProps, enableReactionPredict
    } = this.state;
    const ids = checkedIds.toArray();
    const disabledPrint = !elementType || ids.length === 0;
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
                  this.downloadPrintCodesPDF(ids, e.name);
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
