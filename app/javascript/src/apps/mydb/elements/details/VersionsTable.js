/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Pager } from 'react-bootstrap';
import BootstrapTable from 'react-bootstrap-table-next';
import VersionsFetcher from 'src/fetchers/VersionsFetcher';
import VersionsTableTime from 'src/apps/mydb/elements/details/VersionsTableTime';
import VersionsTableChanges from 'src/apps/mydb/elements/details/VersionsTableChanges';

export default class VersionsTable extends Component {
  constructor(props) {
    super(props);

    this.state = {
      versions: [],
      page: 1,
      pages: 1,
    };
  }

  componentDidMount() {
    this.fetchVersions();
  }

  handlePagerClick = (eventKey) => {
    if (eventKey === 'prev') {
      this.setState((state) => ({
        page: state.page + 1
      }), this.fetchVersions);
    } else {
      this.setState((state) => ({
        page: state.page - 1
      }), this.fetchVersions);
    }
  };

  fetchVersions() {
    const { type, id } = this.props;
    const { page } = this.state;

    VersionsFetcher.fetch({
      type, id, page
    }).then((result) => {
      if (!result) return false;

      return this.setState({
        versions: result.elements || [],
        page: result.page || 1,
        pages: result.pages || 1,
      });
    });
  }

  render() {
    const { versions, page, pages } = this.state;

    const pagination = () => (
      <Pager>
        <Pager.Item
          previous
          href="#"
          onClick={() => this.handlePagerClick('prev')}
          disabled={page >= pages}
        >
          &larr; Previous Page
        </Pager.Item>
        <Pager.Item
          next
          href="#"
          onClick={() => this.handlePagerClick('next')}
          disabled={page <= 1}
        >
          Next Page &rarr;
        </Pager.Item>
      </Pager>
    );

    const columns = [
      {
        dataField: 'id',
        text: '#',
      },
      {
        dataField: 'createdAt',
        text: 'Created',
        // eslint-disable-next-line react/no-unstable-nested-components
        formatter: (cell) => (
          <VersionsTableTime dateTime={cell} />
        ),
      },
      {
        dataField: 'klass',
        text: 'Entity',
      },
      {
        dataField: 'name',
        text: 'Name',
      },
      {
        dataField: 'userName',
        text: 'Author',
      },
    ];

    const expandRow = {
      onlyOneExpanding: true,
      parentClassName: 'active',
      renderer: (row) => (
        <VersionsTableChanges changes={row.changes} />
      ),
    };

    return (
      <>
        <style>
          {`
          .reset-expansion-style {
            background: white;
          }
        `}
        </style>
        <BootstrapTable
          keyField="id"
          data={versions}
          columns={columns}
          expandRow={expandRow}
          style={{ fontSize: 10 }}
          hover
        />
        {pagination()}
      </>
    );
  }
}

VersionsTable.propTypes = {
  type: PropTypes.string.isRequired,
  id: PropTypes.number.isRequired,
};
