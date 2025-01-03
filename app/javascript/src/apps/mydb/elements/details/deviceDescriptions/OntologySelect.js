import React, { useState, useEffect } from 'react';
import { AsyncSelect } from 'src/components/common/Select';
import { Badge } from 'react-bootstrap';

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
        <div className="d-flex justify-content-between flex-wrap">
          <div>{data.label}</div>
          <div className="ms-auto">
            <Badge bg="primary" className="me-1">
              {data.short_form}
            </Badge>
            <Badge bg="info">
              {data.ontology_prefix}
            </Badge>
          </div>
          {desc && (
            <div className="w-100 mt-1" style={{ fontSize: '11px' }}>{desc}</div>
          )}
        </div>
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

  paths.push({
    label: data.label,
    iri: data.iri,
    short_form: data.short_form,
  });

  terms.map((path) => {
    if (path.label === 'planned process' || stopIteration) {
      stopIteration = true;
    } else {
      paths.push({
        label: path.label,
        iri: path.iri,
        short_form: path.short_form,
      });
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
    />
  );
};

export default OntologySelect;
