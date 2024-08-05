// initial custom header for sort button taken from: https://www.ag-grid.com/react-data-grid/component-header/

import React, { Component } from 'react';

export default class CustomHeader extends Component {
  constructor(props) {
    super(props);

    this.state = {
      ascSort: 'inactive',
      descSort: 'inactive',
      noSort: 'inactive',
    };

    props.column.addEventListener('sortChanged', this.onSortChanged.bind(this));
  }

  componentDidMount() {
    this.onSortChanged();
  }

  componentWillUnmount() {
    this.onSortChanged();
  }

  onSortChanged() {
    this.setState({
      ascSort: this.props.column.isSortAscending() ? 'sort_active' : 'inactive',
      descSort: this.props.column.isSortDescending() ? 'sort_active' : 'inactive',
      noSort:
        !this.props.column.isSortAscending() &&
          !this.props.column.isSortDescending()
          ? 'sort_active'
          : 'inactive',
    });
  }

  onSortRequested(order, event) {
    this.props.setSort(order, event.shiftKey);
  }

  clickToRename() {
    const columnClicked = this.props.column.colId;
    { this.props.handleColumnNameModalShow('rename', columnClicked) }
  }

  render() {
    let sort = null;
    if (this.props.enableSorting) {
      sort = (
        <div className="d-inline-block">
          <div
            onClick={this.onSortRequested.bind(this, 'asc')}
            onTouchEnd={this.onSortRequested.bind(this, 'asc')}
            className={`customSortUpLabel ${this.state.ascSort}`}
          >
            <i className="fa fa-arrow-up"></i>
          </div>
          <div
            onClick={this.onSortRequested.bind(this, 'desc')}
            onTouchEnd={this.onSortRequested.bind(this, 'desc')}
            className={`customSortDownLabel ${this.state.descSort}`}
          >
            <i className="fa fa-arrow-down"></i>
          </div>
          <div
            onClick={this.onSortRequested.bind(this, '')}
            onTouchEnd={this.onSortRequested.bind(this, '')}
            className={`customSortRemoveLabel ${this.state.noSort}`}
          >
            <i className="fa fa-times"></i>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="customHeaderLabel" onClick={this.clickToRename.bind(this)}>{this.props.displayName}</div>
        {sort}
      </div>
    );
  }
}
