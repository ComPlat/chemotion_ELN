import React, { Component } from 'react';
import { Button } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import Aviator from 'aviator';
import DragDropItemTypes from './DragDropItemTypes';
import UIStore from './stores/UIStore';
import { wellplateShowOrNew } from './routesUtils';
import QuillViewer from './QuillViewer';
// import Wellplate from './models/Wellplate';

const target = {
  drop(props, monitor) {
    const { dropWellplate } = props;
    const item = monitor.getItem();
    const itemType = monitor.getItemType();
    if (itemType === 'wellplate') {
      dropWellplate(item.element);
    }
  },
  canDrop(props, monitor) {
    const itemType = monitor.getItemType();
    return (itemType === 'wellplate');
  }
};

const collect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

class ResearchPlanWellplates extends Component {
  handleWellplateClick(wellplate) { // eslint-disable-line class-methods-use-this
    const { currentCollection, isSync } = UIStore.getState();
    const wellplateID = wellplate.id;
    const uri = `/${isSync ? 's' : ''}collection/${currentCollection.id}/wellplate/${wellplateID}`;
    Aviator.navigate(uri, { silent: true });
    wellplateShowOrNew({ params: { wellplateID } });
  }

  renderDropZone() {
    const { isOver, connectDropTarget } = this.props;
    const style = {
      padding: 10, borderStyle: 'dashed', textAlign: 'center', color: 'gray', marginTop: '12px', marginBottom: '8px'
    };
    if (isOver) { style.borderColor = '#337ab7'; }

    return connectDropTarget( // eslint-disable-line function-paren-newline
      <div style={style}>
        Drop Wellplate here to add.
      </div>);
  }


  render() {
    const { wellplates, deleteWellplate } = this.props;

    return (
      <div>
        {this.renderDropZone()}

        <table width="100%">
          <thead>
            <tr>
              <th width="45%">Name</th>
              <th width="50%">Description</th>
              <th width="5%" />
            </tr>
          </thead>
          <tbody>
            {wellplates && wellplates.map(wellplate => (
              // <div key={wellplate.id}>
              //   {wellplate.name}<br />
              // </div>
              <tr key={wellplate.id} style={{ height: '80px', verticalAlign: 'middle' }}>
                <td>
                  <a
                    onClick={() => this.handleWellplateClick(wellplate)}
                    style={{ cursor: 'pointer' }}
                  >
                    {wellplate.name}
                  </a>
                </td>
                <td>
                  <QuillViewer
                    value={wellplate.description}
                    theme="bubble"
                    height="44px"
                  />
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <Button
                    bsStyle="danger"
                    style={{ marginLeft: '10px' }}
                    onClick={() => deleteWellplate(wellplate)}
                  >
                    <i className="fa fa-trash-o" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>);
  }
}

export default DropTarget(DragDropItemTypes.WELLPLATE, target, collect)(ResearchPlanWellplates);

ResearchPlanWellplates.propTypes = { /* eslint-disable react/no-unused-prop-types */
  wellplates: PropTypes.arrayOf(PropTypes.object).isRequired,
  deleteWellplate: PropTypes.func.isRequired,
  // updateWellplate: PropTypes.func.isRequired,
  // saveWellplate: PropTypes.func.isRequired,
  dropWellplate: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
  connectDropTarget: PropTypes.func.isRequired
}; /* eslint-enable */
