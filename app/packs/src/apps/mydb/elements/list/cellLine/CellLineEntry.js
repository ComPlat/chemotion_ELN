import React, { Component } from 'react';
import UIStore from 'src/stores/alt/stores/UIStore';
import CellLineItemEntry from 'src/apps/mydb/elements/list/cellLine/CellLineItemEntry';

export default class CellLineEntry extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    UIStore.getState();
    // ElementStore.listen(this.onChange);
    // UIStore.listen(this.onChangeUI);
    this.initState();
  }

  componentWillUnmount() {
    // ElementStore.unlisten(this.onChange);
    // UIStore.unlisten(this.onChangeUI);
  }

  render() {
    if (this.props.cellLineGroup.cellLineItems.length == 0) { return (null); }
    const firstCellLineItem = this.props.cellLineGroup.cellLineItems[0];
    return (
      <div className="list-container">
        <br />
        ID:
        {' '}
        {firstCellLineItem.cellLineId}
        {' '}
        -
        {firstCellLineItem.cellLineName}
        <br />
        {firstCellLineItem.organism}
        {' '}
        -
        {firstCellLineItem.disease}

        {this.props.cellLineGroup.cellLineItems.map(
          (cellLineItem) => <CellLineItemEntry cellLineItem={cellLineItem} />
        )}
      </div>

    );
  }

  initState() {
    // this.onChange(ElementStore.getState());
  }
}
