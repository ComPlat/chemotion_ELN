import React from 'react';
import { ListGroupItem } from 'react-bootstrap';
import SvgFileZoomPan from 'react-svg-file-zoom-pan';

function renderSvg(svg) {
  let newSvg = svg.replace(/<rect.*\/>/, '');
  const viewBox = svg.match(/viewBox="(.*)"/)[1];
  newSvg = newSvg.replace(/<svg.*viewBox.*>/, '');
  newSvg = newSvg.replace(/<\/svg><\/svg>/, '</svg>');
  const svgDOM = new DOMParser().parseFromString(newSvg, 'image/svg+xml');
  const editedSvg = svgDOM.documentElement;
  editedSvg.removeAttribute('width');
  editedSvg.removeAttribute('height');
  editedSvg.setAttribute('viewBox', viewBox);
  editedSvg.setAttribute('width', '100%');
  return editedSvg.outerHTML;
}

export default class RsmiItem extends React.Component {
  constructor() {
    super();

    this.selectSmi = this.selectSmi.bind(this);
  }

  selectSmi() {
    const { uid, idx } = this.props;
    this.props.selectSmi(uid, idx);
  }

  render() {
    const {
      uid, idx, selected, svg, smi
    } = this.props;
    const sel = selected.filter(x => x.uid === uid && x.rsmiIdx === idx);
    const className = sel.length > 0 ? 'list-group-item-info' : '';

    return (
      <ListGroupItem className={`${className} rsmi-item`}>
        <SvgFileZoomPan svg={renderSvg(svg)} duration={200} />
        <div
          role="presentation"
          className="smi-text"
          onClick={this.selectSmi}
          onKeyPress={this.selectSmi}
        >
          {smi}
        </div>
      </ListGroupItem>
    );
  }
}

RsmiItem.propTypes = {
  selectSmi: React.PropTypes.func.isRequired,
  uid: React.PropTypes.string.isRequired,
  smi: React.PropTypes.string.isRequired,
  svg: React.PropTypes.string.isRequired,
  idx: React.PropTypes.number.isRequired,
  selected: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  children: React.PropTypes.node
};
