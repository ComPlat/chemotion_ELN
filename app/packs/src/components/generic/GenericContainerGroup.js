/* eslint-disable react/forbid-prop-types */
/* eslint-disable react/no-array-index-key */
import React from 'react';
import PropTypes from 'prop-types';
import { PanelGroup } from 'react-bootstrap';
import { AiHeader, AiHeaderDeleted } from 'src/components/generic/GenericContainer';

const GenericContainerGroup = (props) => {
  const {
    ae, readOnly, generic, fnUndo, fnChange, fnRemove, noAct, linkedAis, handleSubmit
  } = props;
  // if (ae.length < 1 || ae[0].children.length < 0 || ae[0].children.filter(x => linkedAis.includes(x.id).length < 1)) return null;
  if (ae.length < 1 || ae[0].children.length < 0) return null;
  const ais = noAct ? ae[0].children.filter(x => linkedAis.includes(x.id)) : ae[0].children;
  return (
    <PanelGroup
      id="gen_el_analysis_list"
      defaultActiveKey={0}
      accordion
    >
      {ais.map((container, key) => {
        if (container.is_deleted) {
          return (
            <AiHeaderDeleted
              key={key}
              container={container}
              idx={key}
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
            idx={key}
            generic={generic}
            readOnly={readOnly}
            fnChange={fnChange}
            fnRemove={fnRemove}
            noAct={noAct}
            handleSubmit={handleSubmit}
          />
        );
      })}
    </PanelGroup>
  );
};

GenericContainerGroup.propTypes = {
  ae: PropTypes.array.isRequired,
  readOnly: PropTypes.bool.isRequired,
  generic: PropTypes.object.isRequired,
  fnChange: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  fnUndo: PropTypes.func,
  fnRemove: PropTypes.func,
  noAct: PropTypes.bool,
  linkedAis: PropTypes.array
};

GenericContainerGroup.defaultProps = {
  fnUndo: () => {}, fnRemove: () => {}, noAct: false, linkedAis: []
};

export default GenericContainerGroup;
