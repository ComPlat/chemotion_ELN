import React from 'react';
import PropTypes from 'prop-types';
import { ListGroupItem } from 'react-bootstrap';
import SvgFileZoomPan from 'react-svg-file-zoom-pan';

import DeleteBtn from './DeleteBtn';
import ListProps from './ListProps';
import XmlDetails from './XmlDetails';

function RsmiItem({
  desc, details, idx, removeSmi, svg, smi, selectSmi, selected, uid
}) {
  const className = selected ? 'list-group-item-info' : '';

  const descList = [];
  if (Object.keys(desc).includes('time')) {
    const el = <ListProps key="sample" label="Description" listProps={desc} />;
    descList.push(el);
  } else {
    Object.keys(desc).forEach((group) => {
      if (group === 'detail') return;

      Object.keys(desc[group]).forEach((d) => {
        const dgroup = group.endsWith('s') ? group.slice(0, -1) : group;
        let label = dgroup;
        if (group !== 'reagents') {
          label = `${dgroup} ${parseInt(d, 10) + 1}`;
        }

        const list = (
          <ListProps key={label} label={label} listProps={desc[group][d]} />
        );
        descList.push(list);
      });
    });
  }

  return (
    <ListGroupItem className={`${className} rsmi-item`}>
      <DeleteBtn obj={{ uid, idx }} onClick={removeSmi} />
      <div>
        <SvgFileZoomPan svg={svg} duration={200} />
        <div
          role="presentation"
          className="smi-text"
          onClick={selectSmi}
          onKeyPress={selectSmi}
        >
          {smi}
        </div>
        <div>
          <div
            role="presentation"
            className="chemread-description"
          >
            {descList}
          </div>
          <div
            role="presentation"
            className="chemread-details"
          >
            <XmlDetails details={details} />
          </div>
        </div>
      </div>
    </ListGroupItem>
  );
}

RsmiItem.propTypes = {
  desc: PropTypes.object.isRequired,
  details: PropTypes.object.isRequired,
  selectSmi: PropTypes.func.isRequired,
  removeSmi: PropTypes.func.isRequired,
  uid: PropTypes.string.isRequired,
  svg: PropTypes.string.isRequired,
  smi: PropTypes.string.isRequired,
  idx: PropTypes.number.isRequired,
  selected: PropTypes.bool.isRequired
};

export default RsmiItem;
