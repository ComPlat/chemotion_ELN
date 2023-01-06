import React, { useContext } from 'react';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const SearchResult = ({}) => {
  const searchResultsStore = useContext(StoreContext).searchResults;
  const results = searchResultsStore.searchResultValues;

  const resultsCount = () => {
    const counts = results.map((val) => {
      return val.results.total_elements;
    });
    const sum = counts.reduce((a, b) => a + b, 0);
    return sum;
  }

  const SearchResultsList = () => {
    console.log('result', results, resultsCount());
    return (
      <>
        {
          results.map((val, i) => {
            return <div key={i}>{val.id}: {val.results.total_elements}</div>
          })
        }
      </>
    );
  }

  return (
    <>
      <div>
        <h4>{resultsCount()} results</h4>
        <SearchResultsList />
      </div>
    </>
  );
}

export default observer(SearchResult);
