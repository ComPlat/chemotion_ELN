import React, { useContext, useState, useEffect } from 'react';
import { Tab, Pagination } from 'react-bootstrap';
import { observer } from 'mobx-react';
import UIStore from 'src/stores/alt/stores/UIStore';
import { StoreContext } from 'src/stores/mobx/RootStore';
import SampleName from 'src/components/common/SampleName';
import SvgWithPopover from 'src/components/common/SvgWithPopover';

const SearchResultTabContent = ({ list, tabResult }) => {
  const searchStore = useContext(StoreContext).search;
  let currentPage = searchStore.tab_current_page[list.index];
  let currentPageNumber = currentPage === undefined ? 1 : currentPage[list.key];

  useEffect(() => {
    if (currentPage === undefined) {
      searchStore.changeTabCurrentPage(list.key, 1, list.index);
    }
  }, []);

  const handlePaginationSelect = (index, ids, key) => {
    searchStore.changeTabCurrentPage(key, index, list.index);

    const search_result = searchStore.tabSearchResultValues.find(val => val.id == `${key}s-${index}`);
    if (search_result === undefined) {
      searchByIds(index, ids, key);
    }
  }

  const searchByIds = (index, ids, key) => {
    const uiState = UIStore.getState();
    const { currentCollection } = uiState;
    const collectionId = currentCollection ? currentCollection.id : null;
    const isSync = currentCollection ? currentCollection.is_sync_to_me : false;

    const selection = {
      elementType: 'by_ids',
      id_params: {
        model_name: key,
        ids: ids,
        total_elements: tabResult.total_elements,
        with_filter: false,
      },
      list_filter_params: {},
      search_by_method: 'search_by_ids',
      page_size: tabResult.per_page
    };

    searchStore.loadSearchResultTab({
      selection,
      collectionId: collectionId,
      isSync: isSync,
      page_size: tabResult.per_page,
      page: index
    });
  }

  const pagination = (tabResult, key) => {
    if (tabResult.pages === 1) { return; }
    if (tabResult.total_elements == 0) { return; }

    let splittedIds = [];
    let items = [];
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
      )
    }
    if (tabResult.pages > maxPage) {
      items.push(<Pagination.Ellipsis key="Ell2" />);
    }
    if (currentPageNumber < tabResult.pages) {
      items.push(<Pagination.Next key="Next" onClick={() => handlePaginationSelect(currentPageNumber + 1, splittedIds[currentPageNumber], key)} />);
      items.push(<Pagination.Last key="Last" onClick={() => handlePaginationSelect(tabResult.pages, splittedIds[tabResult.pages - 1], key)} />);
    }

    return (
      <div className="search-result-pagination">
        <Pagination>
          {items}
        </Pagination>
      </div>
    );
  }

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
          title: title,
          src: object.svgPath,
          height: '26vh',
          width: '52vw',
        }}
      />
    );
  }

  const tabContentList = () => {
    let contentList = <div key={list.index} className="search-result-tab-content-list-white">No results</div>;
    let resultsByPage = searchStore.tabSearchResultValues.find(val => val.id == `${list.key}s-${currentPageNumber}`);
    let tabResultByPage = resultsByPage != undefined ? resultsByPage.results : { elements: [] };

    if (tabResultByPage.elements.length > 0) {
      contentList = tabResultByPage.elements.map((object, i, elements) => {
        let previous = elements[i - 1];
        let previousMolecule = previous ? previous.molecule_formula : '';
        let moleculeName = previous && previousMolecule == object.molecule_formula ? '' : <SampleName sample={object} />;
        let shortLabelWithName = ['screen', 'research_plan'].includes(object.type) ? object.name : [object.short_label, object.name].join(" - ");

        if (['sample', 'reaction'].includes(object.type)) {
          return (
            <div key={`${list.key}-${i}`} className="search-result-tab-content-list">
              <div key={moleculeName} className={`search-result-molecule ${object.type}`}>
                {moleculeName || object.type == 'reaction' ? svgPreview(object) : ''}
                {moleculeName}
              </div>
              <span className="search-result-tab-content-list-name">
                {shortLabelWithName}
              </span>
            </div>
          )
        } else {
          return (
            <div key={`${list.key}-${i}`} className="search-result-tab-content-list-white">
              <div key={object.type}>
                {shortLabelWithName}
              </div>
            </div>
          )
        }
      });
    } else if (tabResult.total_elements != 0) {
      contentList = <div className="tab-spinner"><i className="fa fa-spinner fa-pulse fa-3x fa-fw" /></div>;
    }
    return contentList;
  }

  return (
    <Tab.Pane eventKey={list.index} key={`${list.key}_tabPanel`}>
      <div className="search-result-tab-content-container">
        {tabContentList()}
      </div>
      {pagination(tabResult, list.key)}
    </Tab.Pane>
  );
}

export default observer(SearchResultTabContent);
