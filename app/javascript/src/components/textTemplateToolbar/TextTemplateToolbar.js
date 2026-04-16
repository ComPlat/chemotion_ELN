import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import ToolbarIcon from 'src/components/reactQuill/ToolbarIcon';
import TextTemplateIcon from 'src/apps/admin/textTemplates/TextTemplateIcon';
import ToolbarDropdown from 'src/components/reactQuill/ToolbarDropdown';
import TextTemplateStore from 'src/stores/alt/stores/TextTemplateStore';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';

const getNamesFromTemplate = (template) => {
  if (!template) return [];

  // eslint-disable-next-line no-underscore-dangle
  const iconNames = template._toolbar || [];
  const dropdownNames = {};

  // MT dropdown uses stable keys _mt (data) and _mt_label (display name)
  // eslint-disable-next-line no-underscore-dangle
  if (template._mt !== undefined) {
    // eslint-disable-next-line no-underscore-dangle
    dropdownNames[template._mt_label || 'MT'] = template._mt;
  }

  const reservedKeys = ['_toolbar', '_mt', '_mt_label'];
  Object.keys(template).filter(k => !reservedKeys.includes(k)).forEach((k) => {
    dropdownNames[k] = template[k];
  });

  return [iconNames, dropdownNames];
};

const TextTemplateToolbar = ({ template, predefinedTemplates, applyTemplate }) => {
  const [personalTemplates, setPersonalTemplates] = useState(
    TextTemplateStore.getState().personalTemplates || []
  );

  useEffect(() => {
    const onChange = ({ personalTemplates: pt }) => setPersonalTemplates(pt || []);
    TextTemplateStore.listen(onChange);
    TextTemplateActions.fetchPersonalTemplates();
    return () => TextTemplateStore.unlisten(onChange);
  }, []);

  const resolveTemplate = (name) => {
    if (predefinedTemplates[name]) return predefinedTemplates[name];
    return personalTemplates.find(pt => pt.name === name);
  };

  const [iconNames, dropdownNames] = getNamesFromTemplate(template);

  return (
    <React.Fragment>
      {iconNames.map((name) => {
        const resolved = resolveTemplate(name);
        if (!resolved) return <span key={name} />;

        const onClick = () => applyTemplate(resolved.data || {});
        const icon = <TextTemplateIcon template={resolved} />;

        return (
          <ToolbarIcon
            key={`icon_${name}`}
            icon={icon}
            template={resolved}
            onClick={onClick}
          />
        );
      })}
      {Object.keys(dropdownNames).map((label) => {
        const items = {};
        dropdownNames[label].filter(k => resolveTemplate(k)).forEach((k) => { items[k.toUpperCase()] = k; });
        const onSelect = (_k, v) => {
          const resolved = resolveTemplate(v);
          if (resolved) applyTemplate(resolved.data || {});
        };
        const dropdownLabel = dropdownNames[label];
        return (
          <ToolbarDropdown
            key={`dd_${label}`}
            label={label !== '' ? label : `${dropdownLabel[0]} `}
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
