import React from 'react';
import PropTypes from 'prop-types';

const BaseToolbar = ({ indent }) => (
  <React.Fragment>
    <select className="ql-header" defaultValue="" title="Heading">
      <option value="1" />
      <option value="2" />
      <option value="3" />
      <option value="4" />
      <option value="5" />
      <option value="6" />
      <option />
    </select>
    <button className="ql-bold" title="Bold (Ctrl+B)" />
    <button className="ql-italic" title="Italic (Ctrl+I)" />
    <button className="ql-underline" title="Underline (Ctrl+U)" />
    <button className="ql-list" value="ordered" title="Numbered List" />
    <button className="ql-list" value="bullet" title="Bullet List" />
    {indent && <button className="ql-indent" value="-1" title="Decrease Indent" />}
    {indent && <button className="ql-indent" value="+1" title="Increase Indent" />}
    <button className="ql-script" value="sub" title="Subscript (Ctrl+,)" />
    <button className="ql-script" value="super" title="Superscript (Ctrl+.)" />
  </React.Fragment>
);

BaseToolbar.propTypes = {
  indent: PropTypes.bool,
};

BaseToolbar.defaultProps = {
  indent: false,
};

export default BaseToolbar;
