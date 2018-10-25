import React from 'react';
import PropTypes from 'prop-types';
import { ListGroupItem, Label } from 'react-bootstrap';
import SvgFileZoomPan from 'react-svg-file-zoom-pan';

import DeleteBtn from './DeleteBtn';
import SelectBtn from './SelectBtn';
import CopyClipboardBtn from './CopyClipboardBtn';
import EditCommentBtn from './EditCommentBtn';
import ListProps from './ListProps';
import PerkinElnDetails from './PerkinElnDetails';

import { renderSvg } from './ChemScannerObjectHelper';

function ScannedItem({
  uid, cdIdx, idx, removeSmi, editComment, selectSmi, selected, content, modal
}) {
  const {
    svg, smi, description, details, comment,
    products_mdl, reactants_mdl, reagents_mdl
  } = content;
  let { mdl } = content;

  const isSelected = selected.filter(x => (
    x.uid === uid && x.smiIdx === idx
  )).length > 0;
  let selectedLabel = <span />;
  if (isSelected) {
    selectedLabel = (
      <Label bsStyle="primary" style={{ float: 'right' }}>Selected</Label>
    );
  }

  const descList = [];
  const descStyle = {
    marginRight: '10px',
    float: 'left',
    display: 'flow-root'
  };

  if (description.reaction) {
    descList.push(
      <ListProps
        key="reaction"
        label="reaction"
        listProps={description.reaction}
        style={{ marginRight: '10px', display: 'flow-root' }}
      />
    );

    Object.keys(description).forEach((key) => {
      if (key === 'reaction') return;

      const obj = description[key];
      descList.push(
        <ListProps
          key={key}
          label={key}
          listProps={obj}
          style={descStyle}
        />
      );
    });
  } else {
    descList.push(
      <ListProps
        key="sample"
        label="Description"
        listProps={description}
        style={descStyle}
      />
    );
  }

  const container = document.getElementById(modal);
  if (!mdl) {
    mdl = (reactants_mdl.concat(reagents_mdl, products_mdl)).join('\n$$$$\n');
  }

  return (
    <ListGroupItem className="rsmi-item">
      <DeleteBtn obj={{ uid, cdIdx, idx }} onClick={removeSmi} />
      <CopyClipboardBtn
        identifier={{ uid, cdIdx, idx }}
        smi={smi}
        mdl={mdl}
        container={container}
      />
      <EditCommentBtn
        onChangeComment={editComment}
        comment={comment}
        id={{ uid, cdIdx, idx }}
      />
      <SelectBtn
        uid={uid}
        cdIdx={cdIdx}
        idx={idx}
        onClick={selectSmi}
        selected={isSelected}
      />
      { selectedLabel }
      <SvgFileZoomPan svg={renderSvg(svg)} duration={200} />
      {descList}
      <div
        role="presentation"
        className="chemscanner-eln"
      >
        <PerkinElnDetails details={details} />
      </div>
    </ListGroupItem>
  );
}

ScannedItem.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  content: PropTypes.object.isRequired,
  selectSmi: PropTypes.func.isRequired,
  removeSmi: PropTypes.func.isRequired,
  editComment: PropTypes.func.isRequired,
  uid: PropTypes.string.isRequired,
  idx: PropTypes.number.isRequired,
  cdIdx: PropTypes.number.isRequired,
  selected: PropTypes.arrayOf(PropTypes.object).isRequired,
  modal: PropTypes.string
};

ScannedItem.defaultProps = {
  modal: ''
};

export default ScannedItem;
