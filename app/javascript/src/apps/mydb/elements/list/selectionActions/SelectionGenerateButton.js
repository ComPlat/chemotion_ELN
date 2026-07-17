import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import PrintCodeFetcher from 'src/fetchers/PrintCodeFetcher';
import UIStore from 'src/stores/alt/stores/UIStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import MatrixCheck from 'src/components/common/MatrixCheck';
import { PDFDocument } from 'pdf-lib';
import Utils from 'src/utilities/Functions';
import isUIComponentEnabled from 'src/utilities/UIComponentHelper';
import 'whatwg-fetch';

const SelectionGenerateButton = () => {
  const { currentUser } = useContext(StoreContext).userStore;
  const [checkedIds, setCheckedIds] = useState(UIStore.getState().sample.checkedIds);
  const [json, setJson] = useState({});
  const [hasSampleExplorer, setHasSampleExplorer] = useState(isUIComponentEnabled('sampleExplorer'));

  const ids = checkedIds.toArray();
  const disabledPrint = !(ids.length > 0);
  const pdfMenuItems = Object.entries(json).map(([key]) => ({ key, name: key }));
  const enableComputedProps = MatrixCheck(currentUser?.matrix, 'computedProp');
  const enableReactionPredict = MatrixCheck(currentUser?.matrix, 'reactionPrediction');

  const onUIStoreChange = useCallback((state) => {
    if (state.sample.checkedIds !== checkedIds) {
      setCheckedIds(state.sample.checkedIds);
      const sampleExplorer = isUIComponentEnabled('sampleExplorer', state);
      if (sampleExplorer !== hasSampleExplorer) {
        setHasSampleExplorer(sampleExplorer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    UIStore.listen(onUIStoreChange);

    const importConfigPdf = async () => {
      // Import the PDF configuration when the component mounts
      try {
        const response = await fetch('/json/printingConfig/defaultConfig.json');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const tmpJson = await response.json();
        setJson(tmpJson);
      } catch (err) {
        console.error('Failed to fetch JSON', err);
      }
    };
    importConfigPdf();

    return () => UIStore.unlisten(onUIStoreChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadPrintCodesPDF = async (idsArray, template) => {
    const fetchedData = await PrintCodeFetcher.fetchPrintCodes(idsArray.length > 0 ? idsArray : null, template, json);

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
  };

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
                downloadPrintCodesPDF(ids, e.name);
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
};

export default observer(SelectionGenerateButton);
