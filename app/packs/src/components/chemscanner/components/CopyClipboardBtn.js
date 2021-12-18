import React from 'react';
import PropTypes from 'prop-types';
import Clipboard from 'clipboard';
import { DropdownButton, MenuItem } from 'react-bootstrap';

export default class CopyClipboardBtn extends React.Component {
  constructor(props) {
    super(props);

    const { identifier } = props;
    const { fileUid, cdUid, id } = identifier;
    this.ddId = `clipboard-dropdown-${fileUid}-${cdUid}-${id}`;
  }

  componentDidMount() {
    const { container } = this.props;
    const ddDiv = document.getElementById(this.ddId).parentNode;
    const elements = ddDiv.getElementsByTagName('a');

    if (container) {
      this.clipboard = new Clipboard(elements, { container });
    } else {
      this.clipboard = new Clipboard(elements);
    }
  }

  componentWillUnmount() {
    this.clipboard.destroy();
  }

  render() {
    const {
      smi, mdl, inchi, inchiKey
    } = this.props;
    const clipboardIcon = (<i className="fa fa-clipboard" />);

    return (
      <DropdownButton
        title={clipboardIcon}
        className="clipboard-btn left-btn btn btn-xs"
        id={this.ddId}
      >
        <MenuItem eventKey="1" data-clipboard-text={smi}>SMILES</MenuItem>
        <MenuItem eventKey="2" data-clipboard-text={mdl}>Molfile</MenuItem>
        <MenuItem eventKey="3" data-clipboard-text={inchi}>InChI</MenuItem>
        <MenuItem eventKey="4" data-clipboard-text={inchiKey}>InChIKey</MenuItem>
      </DropdownButton>
    );
  }
}

CopyClipboardBtn.propTypes = {
  smi: PropTypes.string.isRequired,
  mdl: PropTypes.string.isRequired,
  inchi: PropTypes.string.isRequired,
  inchiKey: PropTypes.string.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  identifier: PropTypes.object.isRequired,
  container: PropTypes.instanceOf(Element)
};

CopyClipboardBtn.defaultProps = {
  container: null
};
