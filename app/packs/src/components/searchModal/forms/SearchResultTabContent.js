import React, { useContext, useState, useEffect } from 'react';
import { Tab, Pagination } from 'react-bootstrap';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import SampleName from 'src/components/common/SampleName';

const SearchResultTabContent = ({ list, tabResult }) => {
  const searchResultsStore = useContext(StoreContext).searchResults;
  const [currentPage, setCurrentPage] = useState(1);

  const handlePaginationSelect = (index, ids, key) => {
    console.log('changePage', index, ids);
    setCurrentPage(index);
    //fetchByIdsAndKey
  }

  const pagination = (tabResult, key) => {
    if (tabResult.total_elements === 0 || tabResult.total_elements < tabResult.per_page) { return; }
    const pages = Math.ceil(tabResult.total_elements / tabResult.per_page);
    let splittedIds = [];
    let items = [];
    for (let i = 0; i < tabResult.ids.length; i += tabResult.per_page) {
      splittedIds.push(tabResult.ids.slice(i, i + tabResult.per_page));
    }

    const minPage = Math.max(currentPage - 2, 1);
    const maxPage = Math.min(minPage + 4, pages);
    items.push(<Pagination.First key="First" onClick={() => handlePaginationSelect(1, splittedIds[0], key)} />);
    if (currentPage > 1) {
      items.push(<Pagination.Prev key="Prev" onClick={() => handlePaginationSelect(currentPage - 1, splittedIds[currentPage - 1], key)} />);
    }
    if (minPage > 1) {
      items.push(<Pagination.Ellipsis key="Ell1" />);
    }
    for (let number = minPage; number <= maxPage; number++) {
      items.push(
        <Pagination.Item
          active={number === currentPage}
          onClick={() => handlePaginationSelect(number, splittedIds[number - 1], key)}
        >
          {number}
        </Pagination.Item>
      )
    }
    if (pages > maxPage) {
      items.push(<Pagination.Ellipsis key="Ell2" />);
    }
    if (currentPage < pages) {
      items.push(<Pagination.Next key="Next" onClick={() => handlePaginationSelect(currentPage + 1, splittedIds[currentPage], key)} />);
      items.push(<Pagination.Last key="Last" onClick={() => handlePaginationSelect(pages, splittedIds[pages - 1], key)} />);
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
  
    if (tabResult.elements.length > 0) {
      contentList = tabResult.elements.map((obj, i) => {
        const moleculeName = list.key == "sample" ? <SampleName sample={obj} /> : '';
        return (
          <div key={i} className="search-result-tab-content-list">
            {moleculeName}
            {[obj.short_label, obj.name].join(" - ")}
          </div>
        )
      });
    }
    return contentList;
  }

  return (
    <Tab.Pane eventKey={list.index} key={`${list.key}_tabPanel`}>
      <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
        {tabContentList()}
      </div>
      {pagination(tabResult, list.key)}
    </Tab.Pane>
  );
}

export default observer(SearchResultTabContent);
