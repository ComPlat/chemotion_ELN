import React from 'react';
import {
  Dropdown, DropdownButton
} from 'react-bootstrap';
import PrintCodeFetcher from 'src/fetchers/PrintCodeFetcher';
import UIStore from 'src/stores/alt/stores/UIStore';
import { PDFDocument } from 'pdf-lib'; // <-- Added import
import Utils from 'src/utilities/Functions';
import 'whatwg-fetch';

export default class PrintCodeButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      checkedIds: UIStore.getState().sample.checkedIds,
      json: {},
    };

    this.onUIStoreChange = this.onUIStoreChange.bind(this);
    this.downloadPrintCodesPDF = this.downloadPrintCodesPDF.bind(this);
  }

  async componentDidMount() {
    UIStore.listen(this.onUIStoreChange);
    this.onUIStoreChange(UIStore.getState());

    // Import the file when the component mounts
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
  }

  onUIStoreChange(state) {
    if (state.sample.checkedIds !== this.state.checkedIds) {
      this.setState({
        checkedIds: state.sample.checkedIds
      });
    }
  }

  /**
   * Downloads a PDF file with the print codes for the given element
   */
  async downloadPrintCodesPDF(ids, selectedConfig) {
    // Create a new PDFDocument to merge PDFs into
    const mergedPdf = await PDFDocument.create();

    const { json } = this.state;

    // Fetch PDFs and merge them
    const pdfPromises = ids.map(async (id) => {
      let newUrl = `/api/v1/code_logs/print_codes?element_type=sample&ids[]=${id}`;

      // Append the selected config parameters to the URL
      if (selectedConfig in json) {
        const configValue = json[selectedConfig];
        Object.entries(configValue).forEach(([key, value]) => {
          newUrl += `&${key}=${value}`;
        });
      }

      // Fetch and load the PDF
      const pdfBytes = await PrintCodeFetcher.fetchMergedPrintCodes(newUrl);
      const pdfToMerge = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());

      // Add the pages to the merged PDF
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    });

    // Wait for all PDFs to be processed
    await Promise.all(pdfPromises);

    // Serialize the merged PDF to bytes
    const mergedPdfBytes = await mergedPdf.save();
    // Create a Blob from the bytes
    const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    // Download the merged PDF
    Utils.downloadFile({ contents: url, name: 'print_codes_merged.pdf' });
  }

  render() {
    const { json } = this.state;
    const ids = this.state.checkedIds.toArray();
    const disabledPrint = !(ids.length > 0);
    const menuItems = Object.entries(json).map(([key]) => ({ key, name: key }));

    return (
      <DropdownButton
        id="search-code-split-button"
        variant="light"
        title={<i className="fa fa-barcode" />}
        onClick={this.open}
      >
        {menuItems.map((e) => (
          <Dropdown.Item
            key={e.key}
            disabled={disabledPrint}
            onClick={(event) => {
              event.stopPropagation();
              this.downloadPrintCodesPDF(ids, e.name);

            }}
          >
            {e.name}
          </Dropdown.Item>
        ))}
      </DropdownButton>
    );
  }
}
