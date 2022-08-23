import React from 'react';

const BaseToolbar = () => (
  <React.Fragment>
    <select className="ql-header" defaultValue="">
      <option value="1" />
      <option value="2" />
      <option value="3" />
      <option value="4" />
      <option value="5" />
      <option value="6" />
      <option />
    </select>
    <button className="ql-bold" />
    <button className="ql-italic" />
    <button className="ql-underline" />
    <button className="ql-list" value="ordered" />
    <button className="ql-list" value="bullet" />
    <button className="ql-script" value="sub" />
    <button className="ql-script" value="super" />
  </React.Fragment>
);

export default BaseToolbar;
