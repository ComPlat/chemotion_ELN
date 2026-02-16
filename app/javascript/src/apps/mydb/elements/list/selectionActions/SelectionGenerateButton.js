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

export default class SelectionGenerateButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      checkedIds: UIStore.getState().sample.checkedIds,
      json: {},
      matrix: null,
      enableComputedProps: null,
      enableReactionPredict: null,
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
    if (state.sample.checkedIds !== this.state.checkedIds) {
      this.setState({
        checkedIds: state.sample.checkedIds
      });
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

  async downloadPrintCodesPDF(ids, template) {
    const { json } = this.state;
    const fetchedData = await PrintCodeFetcher.fetchPrintCodes(ids.length > 0 ? ids : null, template, json);

    if (!Array.isArray(fetchedData) || fetchedData.length === 0) {
      console.error('No data received or data is not in expected format');
      return;
    }

    const mergedPdf = await PDFDocument.create();
    const pdfPromises = fetchedData.map(async (base64String) => {
      const pdfBytes = Uint8Array.from(atob(base64String), (c) => c.charCodeAt(0));
      const pdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    });

    await Promise.all(pdfPromises);
    const mergedPdfBytes = await mergedPdf.save();
    const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    Utils.downloadFile({ contents: url, name: 'print_codes_merged.pdf' });
  }

  render() {
    const { json, checkedIds, enableComputedProps, enableReactionPredict } = this.state;
    const ids = checkedIds.toArray();
    const disabledPrint = !(ids.length > 0);
    const pdfMenuItems = Object.entries(json).map(([key]) => ({ key, name: key }));

    return (
      <Dropdown id="selection-generate-button">
        <Dropdown.Toggle variant="light" size="sm">
          <i className="fa fa-file-text-o me-1" />
          <span className="selection-action-text-label">Generate</span>
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
          <Dropdown.Item onClick={ElementActions.showReportContainer} title="Report">
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
