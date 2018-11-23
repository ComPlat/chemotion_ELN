import React from 'react';
import PropTypes from 'prop-types';
import { Label, Button } from 'react-bootstrap';

function renderReactionStatus(status) {
  if (status === 'Failed') {
    return (<Label bsStyle="danger">Failed</Label>);
  }
  if (status === 'Planned') {
    return (<Label bsStyle="info">Planned</Label>);
  }

  return (<Label bsStyle="success">Success</Label>);
}

class ResinLabel extends React.Component {
  constructor() {
    super();

    this.onClickLabel = this.onClickLabel.bind(this);
  }

  onClickLabel() {
    const {
      onClick, uid, idx, cdIdx, atomId, descLabel
    } = this.props;
    onClick(uid, idx, cdIdx, descLabel, atomId);
  }

  render() {
    const { label, isResin } = this.props;
    if (!label) return <span />;

    return (
      <Button
        bsSize="xsmall"
        onClick={this.onClickLabel}
        bsStyle={isResin ? 'info' : 'default'}
      >
        {label}
      </Button>
    );
  }
}

ResinLabel.propTypes = {
  descLabel: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  uid: PropTypes.string,
  idx: PropTypes.number,
  cdIdx: PropTypes.number,
  atomId: PropTypes.number,
  isResin: PropTypes.bool
};

ResinLabel.defaultProps = {
  uid: '',
  idx: 0,
  cdIdx: 0,
  isResin: false
};

function ListProps({
  label, listProps, style, setResin, uid, idx, cdIdx
}) {
  if (!listProps) return <span />;
  if (listProps.constructor === String) {
    return (
      <div style={style}>
        <b>{`${label}: `}</b>
        {listProps}
      </div>
    );
  }

  if (Object.values(listProps).filter(x => x).length === 0) return (<span />);

  const list = Object.keys(listProps).filter(x => (
    x !== 'ID' && x !== 'parentID' && x !== 'mdl'
      && listProps[x] && typeof listProps[x] !== 'object'
  ));
  const { alias } = listProps;
  if (list.length === 0 && alias.length === 0) return <span />;

  const propsList = list.map((k) => {
    const bold = `${k}: `;
    let display = listProps[k];

    if (k === 'status') display = renderReactionStatus(display);

    return (
      <li key={`${label}_${k}`}>
        <b>{bold}</b>
        {display}
      </li>
    );
  });

  let aliasList = <span />;
  if (alias && alias.length > 0) {
    const aliases = alias.map(obj => (
      <ResinLabel
        key={obj.id}
        descLabel={label}
        label={obj.text}
        onClick={setResin}
        atomId={obj.id}
        uid={uid}
        idx={idx}
        cdIdx={cdIdx}
        isResin={obj.isResin}
      />
    ));

    aliasList = (
      <li key="alias">
        <b>Alias: </b>
        {aliases}
      </li>
    );
  }

  return (
    <div style={style}>
      <Label>{label}</Label>
      <ul>
        {propsList}
        {aliasList}
      </ul>
    </div>
  );
}

ListProps.propTypes = {
  label: PropTypes.string.isRequired,
  // listProps: PropTypes.object.isRequired,
  setResin: PropTypes.func,
  uid: PropTypes.string,
  idx: PropTypes.number,
  cdIdx: PropTypes.number,
  // eslint-disable-next-line react/forbid-prop-types
  style: PropTypes.object
};

ListProps.defaultProps = {
  style: {},
  uid: '',
  idx: 0,
  cdIdx: 0,
  setResin: () => null
};

export default ListProps;
