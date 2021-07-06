import React from 'react';
import PropTypes from 'prop-types';

import ToolbarIcon from '../react_quill/ToolbarIcon';
import TextTemplateIcon from '../../admin/text_templates/TextTemplateIcon';
import ToolbarDropdown from '../react_quill/ToolbarDropdown';

const getNamesFromTemplate = (template) => {
  if (!template) return [];

  // eslint-disable-next-line no-underscore-dangle
  const iconNames = template._toolbar || [];
  const dropdownNames = {};
  Object.keys(template).filter(k => k !== '_toolbar').forEach((k) => {
    dropdownNames[k] = template[k];
  });

  return [iconNames, dropdownNames];
};

const TextTemplateToolbar = ({
  template, predefinedTemplates, applyTemplate
}) => {
  const [iconNames, dropdownNames] = getNamesFromTemplate(template);

  return (
    <React.Fragment>
      {iconNames.map((name) => {
        const predefinedTemplate = predefinedTemplates[name];
        if (!predefinedTemplate) return <span key={name} />;

        const onClick = () => applyTemplate(predefinedTemplate.data || {});
        const icon = <TextTemplateIcon template={predefinedTemplate} />;

        return (
          <ToolbarIcon
            key={`icon_${name}`}
            icon={icon}
            template={predefinedTemplate}
            onClick={onClick}
          />
        );
      })}
      {Object.keys(dropdownNames).map((label) => {
        const items = {};
        dropdownNames[label].forEach((k) => {
          items[k.toUpperCase()] = k;
        });
        const onSelect = (_k, v) => {
          const predefinedTemplate = predefinedTemplates[v];
          if (predefinedTemplate) {
            applyTemplate(predefinedTemplate.data || {});
          }
        };

        return (
          <ToolbarDropdown
            key={`dd_${label}`}
            label={label}
            items={items}
            onSelect={onSelect}
          />
        );
      })}
    </React.Fragment>
  );
};

TextTemplateToolbar.propTypes = {
  /* eslint-disable react/forbid-prop-types */
  template: PropTypes.object,
  predefinedTemplates: PropTypes.object,
  applyTemplate: PropTypes.func,
};

TextTemplateToolbar.defaultProps = {
  template: {},
  predefinedTemplates: [],
  applyTemplate: null
};

export default TextTemplateToolbar;
