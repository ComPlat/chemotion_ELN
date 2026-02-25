import React, { useEffect, useContext } from "react";
import { Button, ButtonToolbar, Form, Accordion } from "react-bootstrap";
import UIStore from "src/stores/alt/stores/UIStore";
import { observer } from "mobx-react";
import { StoreContext } from "src/stores/mobx/RootStore";
import {
  togglePanel,
  showErrorMessage,
  AccordeonHeaderButtonForSearchForm,
  panelVariables,
} from "src/components/searchModal/forms/SearchModalFunctions";
import SearchResult from "src/components/searchModal/forms/SearchResult";
import { getEditorById } from "src/components/structureEditor/EditorsInstances";
import KetcherEditor from "src/components/structureEditor/KetcherEditor";

function KetcherRailsform() {
  const [editor, setEditor] = React.useState(null);
  const [iframeHeight, setIframeHeight] = React.useState(0.65 * window.innerHeight);
  const searchStore = useContext(StoreContext).search;
  const panelVars = panelVariables(searchStore);
  const accordionItemClass = searchStore.searchResultsCount > 0 ? " with-result" : "";
  const activeSearchAccordionClass = searchStore.search_accordion_active_key === 0 ? "active" + accordionItemClass : "";
  const activeResultAccordionClass = searchStore.search_accordion_active_key === 1 ? " active with-result" : "";
  const { pgCartridge } = UIStore.getState();
  const iframeStyle = {};

  useEffect(() => {
    const loadEditor = async () => {
      const editorInstance = await getEditorById("ketcher");
      setEditor(editorInstance);
      setIframeHeight(calculateHeight());
    };

    loadEditor();
  }, []);

  useEffect(() => {
    setIframeHeight(calculateHeight());
  }, [panelVars.invisibleClassName, searchStore.error_messages.length]);

  const calculateHeight = () => {
    const searchModalHeaderHeight = document.getElementById('search-modal-header')?.offsetHeight;
    const ketcherSearchHeaderHeight = document.getElementById('ketcher-search-header')?.offsetHeight;
    const ketcherSearchFooterHeight = document.getElementById('ketcher-search-footer')?.offsetHeight;
    const ketcherHeaderHeight = searchModalHeaderHeight + ketcherSearchHeaderHeight + ketcherSearchFooterHeight;
    const headerHeight = ketcherHeaderHeight < 220 ? 220 : ketcherHeaderHeight;
    const buttonsHeight = searchStore.search_result_panel_visible ? ketcherSearchHeaderHeight : 0;
    const errorHeight =
      searchStore.error_messages.length > 0 ? document.getElementById('search-error-message')?.offsetHeight + 16 : 0;
    return window.innerHeight - headerHeight - buttonsHeight - errorHeight;
  };

  const handleSearchTypeChange = (e) => {
    searchStore.changeKetcherRailsValue("searchType", e.target.value);
  };

  const searchValuesByMolfile = () => {
    searchStore.changeSearchValues([searchStore.ketcherRailsValues.queryMolfile]);
  };

  const structureSearch = (molfile) => {
    const uiState = UIStore.getState();
    const { currentCollection } = uiState;
    const collectionId = currentCollection ? currentCollection.id : null;
    const isSync = currentCollection ? currentCollection.is_sync_to_me : false;
    let tanimoto = searchStore.ketcherRailsValues.tanimotoThreshold;
    if (tanimoto <= 0 || tanimoto > 1) {
      tanimoto = 0.3;
    }

    const selection = {
      elementType: "structure",
      molfile,
      search_type: searchStore.ketcherRailsValues.searchType,
      tanimoto_threshold: tanimoto,
      page_size: uiState.number_of_results,
      search_by_method: "structure",
      structure_search: true,
    };
    searchStore.loadSearchResults({
      selection,
      collectionId,
      isSync,
      moleculeSort: true,
    });
    searchStore.clearSearchAndTabResults();
    searchValuesByMolfile();
  };

  const handleTanimotoChange = (e) => {
    const val = e.target && e.target.value;
    if (!Number.isNaN(val - val)) {
      searchStore.changeKetcherRailsValue("tanimotoThreshold", e.target.value);
    }
  };

  const handleStructureEditorSave = (molfile) => {
    if (molfile) {
      searchStore.changeKetcherRailsValue("queryMolfile", molfile);
    }
    const message = "Please add a drawing. The drawing is empty";
    searchStore.addErrorMessage(message);

    /// / Check if blank molfile
    const molfileLines = molfile.match(/[^\r\n]+/g);
    /// / If the first character ~ num of atoms is 0, we will not search
    if (molfileLines[1].trim()[0] !== "0") {
      searchStore.showSearchResults();
      searchStore.enableAccordionToggle();
      searchStore.removeErrorMessage(message);
      structureSearch(molfile);
    }
  };

  const handleSearch = async () => {
    const structure = editor.structureDef;
    handleStructureEditorSave(await structure.editor.getMolfile());
  };

  const handleClear = () => {
    searchStore.clearSearchResults();

    const iframe = document.querySelector('#ketcher').contentWindow;
    iframe.location.reload();
  };

  return (
    <Accordion defaultActiveKey={0} activeKey={searchStore.search_accordion_active_key} className="search-modal" flush>
      <Accordion.Item eventKey={0} className={activeSearchAccordionClass}>
        <h2 className="accordion-header flex-shrink-0" id="ketcher-search-header">
          <AccordeonHeaderButtonForSearchForm
            title={panelVars.searchTitle}
            eventKey={0}
            disabled={searchStore.search_accordion_toggle_disabled}
            callback={togglePanel(searchStore)}
          />
        </h2>
        <Accordion.Collapse eventKey={0}>
          <div className="accordion-body">
            {showErrorMessage(searchStore)}
            <div className="flex-grow-1">
              {editor && <KetcherEditor editor={editor} molfile={""} iH={iframeHeight} iS={iframeStyle} />}
            </div>
            <div className="ketcher-buttons" id="ketcher-search-footer">
              <ButtonToolbar className="gap-2">
                <Button variant="primary" onClick={() => searchStore.handleCancel()}>
                  Cancel
                </Button>
                <Button variant="info" onClick={() => handleClear(searchStore)}>
                  Reset
                </Button>
                <Button variant="warning" onClick={handleSearch}>
                  Search
                </Button>
              </ButtonToolbar>
              <Form className="d-inline-flex flex-nowrap align-items-center gap-5" inline>
                <Form.Check
                  type="radio"
                  value="similar"
                  label="Similarity Search"
                  checked={searchStore.ketcherRailsValues.searchType === "similar"}
                  onChange={handleSearchTypeChange}
                />
                <Form.Control
                  style={{ width: "40%" }}
                  type="text"
                  value={searchStore.ketcherRailsValues.tanimotoThreshold}
                  onChange={handleTanimotoChange}
                />
              </Form>
              <Form inline>
                <Form.Check
                  type="radio"
                  value="sub"
                  label={pgCartridge !== "none" ? `Substructure Search with ${pgCartridge}` : "Substructure Search"}
                  checked={searchStore.ketcherRailsValues.searchType === "sub"}
                  onChange={handleSearchTypeChange}
                />
              </Form>
            </div>
          </div>
        </Accordion.Collapse>
      </Accordion.Item>
      <Accordion.Item eventKey={1} className={`${panelVars.invisibleClassName}${activeResultAccordionClass}`}>
        <h2 className="accordion-header flex-shrink-0">
          <AccordeonHeaderButtonForSearchForm
            title={panelVars.resultTitle}
            eventKey={1}
            callback={togglePanel(searchStore)}
          />
        </h2>
        <Accordion.Collapse eventKey={1} className="search-result-body">
          <div className="accordion-body">
            <SearchResult handleClear={() => handleClear(searchStore)} />
          </div>
        </Accordion.Collapse>
      </Accordion.Item>
    </Accordion>
  );
}

export default observer(KetcherRailsform);
