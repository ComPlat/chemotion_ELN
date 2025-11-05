/* eslint-disable react/forbid-prop-types */
/* eslint-disable react/no-array-index-key */
import React from 'react';
import PropTypes from 'prop-types';
import { Accordion } from 'react-bootstrap';
import {
  AiHeader,
  AiHeaderDeleted,
} from 'src/components/generic/GenericContainer';

function GenericContainerSet(props) {
  const {
    ae,
    readOnly,
    generic,
    fnUndo,
    fnChange,
    fnSelect,
    fnRemove,
    noAct,
    linkedAis,
    handleSubmit,
    activeKey,
  } = props;
  if (ae.length < 1 || ae[0].children.length < 0) return null;
  const ais = noAct
    ? ae[0].children.filter((x) => linkedAis.includes(x.id))
    : ae[0].children;

  return (
    <Accordion
      id="gen_el_analysis_list"
      className="flex-grow-1"
      onSelect={fnSelect}
      activeKey={activeKey}
      alwaysOpen={false}
    >
      {ais.map((container, key) => {
        if (container.is_deleted) {
          return (
            <AiHeaderDeleted
              key={key}
              container={container}
              idx={String(key)}
              fnUndo={fnUndo}
              noAct={noAct}
              readOnly={readOnly}
            />
          );
        }
        return (
          <AiHeader
            key={key}
            container={container}
            idx={String(key)}
            generic={generic}
            readOnly={readOnly}
            fnChange={fnChange}
            fnRemove={fnRemove}
            noAct={noAct}
            handleSubmit={handleSubmit}
          />
        );
      })}
    </Accordion>
  );
}

GenericContainerSet.propTypes = {
  ae: PropTypes.array.isRequired,
  readOnly: PropTypes.bool.isRequired,
  generic: PropTypes.object.isRequired,
  fnChange: PropTypes.func.isRequired,
  fnSelect: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  fnUndo: PropTypes.func,
  fnRemove: PropTypes.func,
  noAct: PropTypes.bool,
  linkedAis: PropTypes.array,
  activeKey: PropTypes.string,
};

GenericContainerSet.defaultProps = {
  fnUndo: () => {},
  fnRemove: () => {},
  noAct: false,
  linkedAis: [],
  activeKey: '0',
};

export default GenericContainerSet;
