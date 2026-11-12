import React from 'react';
import { Dropdown } from 'react-bootstrap';
import PrintCodeFetcher from 'src/fetchers/PrintCodeFetcher';
import UIStore from 'src/stores/alt/stores/UIStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import MatrixCheck from 'src/components/common/MatrixCheck';
import UserStore from 'src/stores/alt/stores/UserStore';
import { PDFDocument } from 'pdf-lib';
import Utils from 'src/utilities/Functions';
import isUIComponentEnabled from 'src/utilities/UIComponentHelper';
import {
  buildPrintCodeUrls,
  getPrintableSelections,
} from 'src/apps/mydb/elements/list/selectionActions/PrintCodeUtils';
import 'whatwg-fetch';

function selectionsEqual(first, second) {
  const types = new Set([...Object.keys(first), ...Object.keys(second)]);
  return [...types].every((type) => (
    first[type] === second[type]
    || (first[type] && second[type] && first[type].equals(second[type]))
  ));
}

export default class SelectionGenerateButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectionsByType: getPrintableSelections(UIStore.getState()),
      json: {},
      matrix: null,
      enableComputedProps: null,
      enableReactionPredict: null,
      hasSampleExplorer: isUIComponentEnabled('sampleExplorer'),
    };

    this.onUIStoreChange = this.onUIStoreChange.bind(this);
    this.onUserStoreChange = this.onUserStoreChange.bind(this);
    this.downloadPrintCodesPDF = this.downloadPrintCodesPDF.bind(this);
  }

  async componentDidMount() {
    UIStore.listen(this.onUIStoreChange);
    UserStore.listen(this.onUserStoreChange);
    this.onUIStoreChange(UIStore.getState());
    this.onUserStoreChange(UserStore.getState());

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

  onUIStoreChange(state) {
    const selectionsByType = getPrintableSelections(state);
    if (!selectionsEqual(selectionsByType, this.state.selectionsByType)) {
      this.setState({ selectionsByType });
    }
    const hasSampleExplorer = isUIComponentEnabled('sampleExplorer', state);
    if (hasSampleExplorer !== this.state.hasSampleExplorer) {
      this.setState({ hasSampleExplorer });
    }
  }

  onUserStoreChange(state) {
    const { matrix: storeMatrix } = state?.currentUser || {};
    if (this.state.matrix !== storeMatrix) {
      this.setState({
        matrix: storeMatrix,
        enableComputedProps: MatrixCheck(storeMatrix, 'computedProp'),
        enableReactionPredict: MatrixCheck(storeMatrix, 'reactionPrediction'),
      });
    }
  }

  async downloadPrintCodesPDF(template) {
    const { json, selectionsByType } = this.state;
    const config = json[template];
    if (!config) {
      console.error(`Print code configuration "${template}" was not found`);
      return;
    }

    const requests = buildPrintCodeUrls(selectionsByType, config);
    if (requests.length === 0) return;

    try {
      const fetchedPdfs = await Promise.all(
        requests.map((url) => PrintCodeFetcher.fetchMergedPrintCodes(url)),
      );
      const mergedPdf = await PDFDocument.create();
      for (const pdfBytes of fetchedPdfs) {
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

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
      json, selectionsByType, enableComputedProps, enableReactionPredict, hasSampleExplorer
    } = this.state;
    const selectedCount = Object.values(selectionsByType)
      .reduce((count, checkedIds) => count + checkedIds.size, 0);
    const disabledPrint = selectedCount === 0;
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

          {hasSampleExplorer && (
            <Dropdown.Item onClick={ElementActions.showExplorerDetails} title="Explorer">
              Explorer
            </Dropdown.Item>
          )}

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
