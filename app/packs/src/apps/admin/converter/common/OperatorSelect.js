import React, { Component } from "react"

const OperatorSelect = ({ value, onChange }) => (
  <select className="form-control form-control-sm" value={value} onChange={event => onChange(event.target.value)}>
    <option value="+">+</option>
    <option value="-">-</option>
    <option value="*">*</option>
    <option value=":">:</option>
  </select>
)

export default OperatorSelect
