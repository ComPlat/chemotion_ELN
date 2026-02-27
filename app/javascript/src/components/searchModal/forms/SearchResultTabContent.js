import React, { useContext, useEffect } from 'react';
import {
  Tab, Pagination, OverlayTrigger, Tooltip, Badge
} from 'react-bootstrap';
import { observer } from 'mobx-react';
import UIStore from 'src/stores/alt/stores/UIStore';
import { StoreContext } from 'src/stores/mobx/RootStore';
import SampleName from 'src/components/common/SampleName';
import SvgWithPopover from 'src/components/common/SvgWithPopover';

function SearchResultTabContent({ list, tabResult, openDetail }) {
  const searchStore = useContext(StoreContext).search;
  const currentPage = searchStore.tabCurrentPage.length >= 1 ? searchStore.tab_current_page[list.index] : undefined;
  const currentPageNumber = currentPage === undefined ? 1 : currentPage[list.key];
  const activeTabPane = list.index === searchStore.search_result_active_tab_key;

  useEffect(() => {
    if (currentPage === undefined) {
      searchStore.changeTabCurrentPage(list.key, 1, list.index);
    }
  }, []);

  const handlePaginationSelect = (index, ids, key) => {
    searchStore.changeTabCurrentPage(key, index, list.index);

    const search_result = searchStore.tabSearchResultValues.find((val) => val.id == `${key}s-${index}`);
    if (search_result === undefined) {
      searchByIds(index, ids, key);
    }
  };

  const searchByIds = (index, ids, key) => {
    const uiState = UIStore.getState();
    const { currentCollection } = uiState;
    const collectionId = currentCollection ? currentCollection.id : null;
    const isSync = currentCollection ? currentCollection.is_sync_to_me : false;

    const selection = {
      elementType: 'by_ids',
      id_params: {
        model_name: key,
        ids,
        total_elements: tabResult.total_elements,
        with_filter: false,
      },
      list_filter_params: {},
      search_by_method: 'search_by_ids',
      page_size: tabResult.per_page
    };

    searchStore.loadSearchResultTab({
      selection,
      collectionId,
      isSync,
      page_size: tabResult.per_page,
      page: index,
      moleculeSort: true,
    });
  };

  const pagination = (tabResult, key) => {
    if (tabResult.pages === 1) { return; }
    if (tabResult.total_elements == 0) { return; }

    const splittedIds = [];
    const items = [];
    for (let i = 0; i < tabResult.ids.length; i += tabResult.per_page) {
      splittedIds.push(tabResult.ids.slice(i, i + tabResult.per_page));
    }

    const minPage = Math.max(currentPageNumber - 2, 1);
    const maxPage = Math.min(minPage + 4, tabResult.pages);
    items.push(<Pagination.First key="First" onClick={() => handlePaginationSelect(1, splittedIds[0], key)} />);
    if (currentPageNumber > 1) {
      items.push(<Pagination.Prev key="Prev" onClick={() => handlePaginationSelect(currentPageNumber - 1, splittedIds[currentPageNumber - 1], key)} />);
    }
    if (minPage > 1) {
      items.push(<Pagination.Ellipsis key="Ell1" />);
    }
    for (let number = minPage; number <= maxPage; number++) {
      items.push(
        <Pagination.Item
          key={number}
          active={number === currentPageNumber}
          onClick={() => handlePaginationSelect(number, splittedIds[number - 1], key)}
        >
          {number}
        </Pagination.Item>
      );
    }
    if (tabResult.pages > maxPage) {
      items.push(<Pagination.Ellipsis key="Ell2" />);
    }
    if (currentPageNumber < tabResult.pages) {
      items.push(<Pagination.Next key="Next" onClick={() => handlePaginationSelect(currentPageNumber + 1, splittedIds[currentPageNumber], key)} />);
      items.push(<Pagination.Last key="Last" onClick={() => handlePaginationSelect(tabResult.pages, splittedIds[tabResult.pages - 1], key)} />);
    }

    return (
      <Pagination className="search-result-pagination">
        {items}
      </Pagination>
    );
  };

  const svgPreview = (object) => {
    if (!['sample', 'reaction'].includes(object.type)) { return null; }

    const title = object.type == 'sample' ? object.molecule_iupac_name : object.short_label;
    return (
      <SvgWithPopover
        hasPop
        previewObject={{
          txtOnly: '',
          isSVG: true,
          src: object.svgPath
        }}
        popObject={{
          title,
          src: object.svgPath,
          height: '26vh',
          width: '52vw',
        }}
      />
    );
  };

  const copyToClipboard = (element) => {
    if (element.target.dataset.clipboardText) {
      navigator.clipboard.writeText(element.target.dataset.clipboardText);
    }
  };

  const shortLabelWithMoreInfos = (object) => {
    let names;
    const tooltip = <Tooltip id="detailTip">Open detail</Tooltip>;

    if (['screen', 'research_plan'].includes(object.type) || object.short_label === undefined) {
      names = [object.name];
    } else if (object.type == 'sample') {
      const infos = [];
      if (object.external_label) { infos.push(object.external_label); }
      if (object.xref && object.inventory_label) { infos.push(object.inventory_label); }
      if (object.xref && object.xref.cas) { infos.push(object.xref.cas); }
      names = [object.short_label, object.name].concat(infos);
    } else if (object.type == 'cell_line') {
      names = [object.short_label, object.itemName];
    } else {
      names = [object.short_label, object.name];
    }
    names = names.filter((e) => e).join(' | ');

    return (
      <OverlayTrigger placement="top" overlay={tooltip}>
        <span onClick={() => openDetail(object)}>
          {names}
        </span>
      </OverlayTrigger>
    );
  };

  const sampleAndReactionList = (object, i, elements) => {
    const previous = elements[i - 1];
    const previousMolecule = previous?.molecule_formula;

    const showSampleHeader = object.type === 'sample' && previousMolecule !== object.molecule_formula;

    return (
      <div
        key={`${object.short_name}-${i}`}
        className="search-result-tab-content-list"
        onClick={copyToClipboard}
      >
        {/* Sample grouping header */}
        {showSampleHeader && (
          <div className="search-result-molecule sample">
            {svgPreview(object)}
            <SampleName sample={object} />
          </div>
        )}

        {/* Reaction SVG — always */}
        {object.type === 'reaction' && (
          <div className="search-result-molecule reaction">
            {svgPreview(object)}
          </div>
        )}

        <span className="search-result-tab-content-list-name">
          {shortLabelWithMoreInfos(object)}
        </span>
      </div>
    );
  };

  const sbmmList = (object, i, elements) => {
    const previous = elements[i - 1];
    const previousSbmm = previous ? previous.sequence_based_macromolecule.id : '';
    const badgeTitle = object.sequence_based_macromolecule.uniprot_derivation.split('_').slice(-1)[0];

    const header = previousSbmm !== object.sequence_based_macromolecule.id && (
      <div
        key={`${object.sequence_based_macromolecule.short_name}-${i}`}
        className="search-result-molecule pt-2 fw-bold fs-5"
      >
        {object.sbmmShortLabel()}
        {' '}
        {object.sequence_based_macromolecule.short_name}
      </div>
    );

    return (
      <div key={`${list.key}-${i}`} className="search-result-tab-content-list">
        {header}
        <div className="search-result-tab-content-list-name pt-3">
          <div className="d-flex align-items-center gap-2">
            <Badge bg="info" className="border border-active bg-opacity-25 text-active rounded">
              {badgeTitle}
            </Badge>
            {shortLabelWithMoreInfos(object)}
          </div>
        </div>
      </div>
    );
  };

  const cellLineList = (object, i, elements) => {
    const previous = elements[i - 1];
    const previousMaterial = previous ? `${previous.cellLineName} - ${previous.source}` : '';
    const objectMaterial = `${object.cellLineName} - ${object.source}`;

    const header = previousMaterial !== objectMaterial && (
      <div
        key={`${objectMaterial}-${i}`}
        className="search-result-molecule pt-2 fw-bold fs-5"
      >
        {objectMaterial}
      </div>
    );

    return (
      <div key={`${list.key}-${i}`} className="search-result-tab-content-list">
        {header}
        <div className="search-result-tab-content-list-name pt-3">
          {shortLabelWithMoreInfos(object)}
        </div>
      </div>
    );
  }

  const tabContentList = () => {
    let contentList = <div key={list.index} className="search-result-tab-content-list-white">No results</div>;
    const resultsByPage = searchStore.tabSearchResultValues.find((val) => val.id == `${list.key}s-${currentPageNumber}`);
    const tabResultByPage = resultsByPage != undefined ? resultsByPage.results : { elements: [] };

    if (tabResultByPage.elements.length > 0) {
      contentList = tabResultByPage.elements.map((object, i, elements) => {
        if (['sample', 'reaction'].includes(object.type)) {
          return sampleAndReactionList(object, i, elements);
        } else if (object.type === 'sequence_based_macromolecule_sample') {
          return sbmmList(object, i, elements);
        } else if (object.type === 'cell_line') {
          return cellLineList(object, i, elements);
        }
        return (
          <div key={`${list.key}-${i}`} className="search-result-tab-content-list-white">
            <div key={object.type}>
              {shortLabelWithMoreInfos(object)}
            </div>
          </div>
        );
      });
    } else if (tabResult.total_elements != 0) {
      contentList = <div className="tab-spinner"><i className="fa fa-spinner fa-pulse fa-3x fa-fw" /></div>;
    }
    return contentList;
  };

  return (
    <Tab.Pane eventKey={list.index} active={activeTabPane} key={`${list.key}_tabPanel`}>
      <div className="search-result-tab-content-container">
        {tabContentList()}
      </div>
      {pagination(tabResult, list.key)}
    </Tab.Pane>
  );
}

export default observer(SearchResultTabContent);
