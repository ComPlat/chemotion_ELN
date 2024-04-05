import React, { useState, useEffect } from 'react';
import AsyncSelect from 'react-select3/async';

const TS_BASE = 'https://service.tib.eu/ts4tib/api/select';
const TS_PATHS = 'https://service.tib.eu/ts4tib/api/ontologies/chmo/hierarchicalAncestors';
const TS_PARAM = [
  'rows=20',
  'collection=nfdi4chem',
  'childrenOf=http://purl.obolibrary.org/obo/OBI_0000011',
  'ontology=chmo',
  'obsoletes=false',
  'local=false',
  'fieldList=id,iri,label,short_form,obo_id,ontology_name,ontology_prefix,description,type',
].join('&');

const constructOption = data => {
  if (data) {
    const desc = data.description?.join('') || '';
    return {
      value: data.id,
      label: (
        <>
          {data.label}
          <span>
            <span className="gu-ontology-select-code-short badge">
              {data.short_form}
            </span>
            &nbsp;
            <span className="gu-ontology-select-code-prefix badge">
              {data.ontology_prefix}
            </span>
            {desc ? (
              <>
                <br />
                <span style={{ fontSize: '11px' }}>{desc}</span>
              </>
            ) : null}
          </span>
        </>
      ),
    };
  }
  return data;
};

const constructOptions = data => {
  if (!data) {
    return [];
  }
  return data.map(d => {
    const option = Object.assign(constructOption(d), { data: d });
    return option;
  });
};

const constructPaths = (terms, data) => {
  const paths = [];
  let stopIteration = false;
  if (!terms) { return paths; }

  paths.push(data.label);

  terms.map((path) => {
    if (path.label === 'planned process' || stopIteration) {
      stopIteration = true;
    } else {
      paths.push(path.label);
    }
  });
  return paths.reverse();
}

const OntologySelect = props => {
  const { fnSelected, store, element } = props;
  const [data, setData] = useState(null);

  const fetchData = async inputValue => {
    try {
      if (!inputValue.trim() || inputValue.length < 3) {
        return [];
      }

      const response = await fetch(`${TS_BASE}?q=${inputValue}&${TS_PARAM}`);
      if (!response.ok) {
        throw new Error('Network request failed');
      }
      const result = await response.json();
      return constructOptions(result?.response?.docs);
    } catch (error) {
      console.error('Error fetching data:', error);
      return [];
    }
  };

  const fetchPaths = async selected => {
    try {
      const response = await fetch(`${TS_PATHS}?short_form=${selected.data.short_form}`);
      if (!response.ok) {
        throw new Error('Network request failed');
      }
      const result = await response.json();
      const paths = constructPaths(result?._embedded?.terms, selected?.data);
      fnSelected(selected?.data, paths, store, element);
    } catch (error) {
      console.error('Error fetching data:', error);
      return [];
    }
  } 

  useEffect(() => {
    fetchData('').then(setData);
  }, []);

  return (
    <AsyncSelect
      backspaceRemoves
      isClearable
      valueKey="value"
      labelKey="label"
      loadOptions={(inputValue, callback) => {
        fetchData(inputValue).then(options => callback(options));
      }}
      onChange={selected => {
        fetchPaths(selected);
      }}
      styles={{
        container: baseStyles => {
          return {
            ...baseStyles,
            width: '100%',
          };
        },
        control: base => {
          return {
            ...base,
            height: '36px',
            minHeight: '36px',
            minWidth: '200px',
            border: '1px solid #ccc',
          };
        },
      }}
    />
  );
};

export default OntologySelect;
