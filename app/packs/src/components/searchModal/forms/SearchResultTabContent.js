import React, { useContext, useState, useEffect } from 'react';
import { Tab, Pagination } from 'react-bootstrap';
import { observer } from 'mobx-react';
import UIStore from 'src/stores/alt/stores/UIStore';
import { StoreContext } from 'src/stores/mobx/RootStore';
import SampleName from 'src/components/common/SampleName';

const SearchResultTabContent = ({ list, tabResult }) => {
  const searchResultsStore = useContext(StoreContext).searchResults;
  let currentPage = searchResultsStore.tab_current_page[list.index];
  let currentPageNumber = currentPage === undefined ? 1 : currentPage[list.key];

  useEffect(() => {
    if (currentPage === undefined) {
      searchResultsStore.changeTabCurrentPage(list.key, 1, list.index);
    }
  }, []);

  const handlePaginationSelect = (index, ids, key) => {
    searchResultsStore.changeTabCurrentPage(key, index, list.index);

    const search_result = searchResultsStore.tabSearchResultValues.find(val => val.id == `${key}s-${index}`);
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
        pages: tabResult.pages,
        total_elements: tabResult.total_elements,
      },
      search_by_method: 'search_by_ids'
    };

    searchResultsStore.loadSearchResultTab({
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

  const tabContentList = () => {
    let contentList = <div key={list.index} className="search-result-tab-content-list">No results</div>;
    let resultsByPage = searchResultsStore.tabSearchResultValues.find(val => val.id == `${list.key}s-${currentPageNumber}`);
    let tabResultByPage = resultsByPage != undefined ? resultsByPage.results : { elements: [] };

    if (tabResultByPage.elements.length > 0) {
      contentList = tabResultByPage.elements.map((obj, i) => {
        let moleculeName = list.key == "sample" && obj.showed_name != null && obj.showed_name != undefined ? <SampleName sample={obj} /> : '';
        return (
          <div key={`${list.key}-${i}`} className="search-result-tab-content-list">
            {moleculeName}
            {[obj.short_label, obj.name].join(" - ")}
          </div>
        )
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
