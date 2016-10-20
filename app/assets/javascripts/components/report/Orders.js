import React, {Component} from 'react'
import { Table } from 'react-bootstrap';
import ReactionRow from './OrdersDnD';

const Orders = ({selectedReactions}) => {
  const content = selectedReactions.map( r => {
    return <ReactionRow id={r.id} key={r.id} element={r} />
  })

  return (
    <Table className="elements" bordered hover>
      <tbody>
        {content}
      </tbody>
    </Table>
  )
}

export default Orders;
