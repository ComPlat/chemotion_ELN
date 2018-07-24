import React from 'react';
import PropTypes from 'prop-types';
import { Button, FormControl } from 'react-bootstrap';
import Immutable from 'immutable';
import Cite from 'citation-js';

import Literature from './models/Literature';
import LiteraturesFetcher from './fetchers/LiteraturesFetcher';

const TitleInput = ({ literature, handleInputChange }) => (
  <FormControl
    type="text"
    onChange={event => handleInputChange('title', event)}
    placeholder="Title..."
    value={literature.title || ''}
  />
);

const UrlInput = ({ literature, handleInputChange }) => (
  <FormControl
    type="text"
    onChange={event => handleInputChange('url', event)}
    placeholder="URL..."
    value={literature.url || ''}
  />
);

const DoiInput = ({ literature, handleInputChange }) => (
  <FormControl
    type="text"
    onChange={event => handleInputChange('doi', event)}
    placeholder="DOI: 10.... or  http://dx.doi.org/10... or 10. ..."
    value={literature.doi || ''}
  />
);

const isLiteratureValid = literature => (
  literature.title !== '' && literature.url.concat(literature.doi) !== ''
);

const AddButton = ({ onLiteratureAdd, literature }) => (
  <Button
    bsStyle="success"
    bsSize="small"
    onClick={() => onLiteratureAdd(literature)}
    style={{ marginTop: 2 }}
    disabled={!isLiteratureValid(literature)}
  >
    <i className="fa fa-plus" />
  </Button>
);


AddButton.propTypes = {
  onLiteratureAdd: PropTypes.func.isRequired,
  literature: PropTypes.object.isRequired
};


const literatureUrl = (literature) => {
  const { url } = literature;
  if (url.match(/https?\:\/\//)) {
    return url;
  }
  return `//${url}`;
};

const sanitizeDoi = (doi) => {
  const m = doi.match(/(?:\.*10\.)(\S+)\s*/);
  return m ? '10.'.concat(m[1]) : null;
};

const doiValid = (doi) => {
  const sanitized = sanitizeDoi(doi);
  return sanitized && sanitized.match(/10.\w+\/\S+/) && true;
};

const Citation = ({ literature }) => {
  const { title, year, doi, url, refs } = literature;
  const formatedDoi = doi ? `https://dx.doi.org/${sanitizeDoi(doi)}` : null;
  const link = formatedDoi || url;
  let content;
  if (refs && refs.citation) {
    content = (
      <div>
        {refs.citation.format('bibliography', {
           format: 'text',
           template: 'apa',
        })}
      </div>
    );
  } else if (refs && refs.bibtex) {
    const citation = new Cite(refs.bibtex);
    content = (
      <div>
        {citation.format('bibliography', {
           format: 'text',
           template: 'apa',
        })}
      </div>
    );
  } else {
    content = <p>{title}{year ? `, ${year}` : null}</p>;
  }
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title={link}
    >{content}
    </a>
  );
};

Citation.propTypes = {
  literature: PropTypes.instanceOf(Literature).isRequired
};

export {
  Citation,
  doiValid,
  sanitizeDoi,
  literatureUrl,
  AddButton,
  isLiteratureValid,
  DoiInput,
  UrlInput,
  TitleInput
};
