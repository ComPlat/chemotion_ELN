import React, {
  useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import PropTypes from 'prop-types';
import { List } from 'immutable';
import { CloseButton, Popover, Form } from 'react-bootstrap';
import { observer } from 'mobx-react';
import { reaction } from 'mobx';

import TabLayoutEditor from 'src/apps/mydb/elements/tabLayout/TabLayoutEditor';
import ConfigOverlayButton from 'src/components/common/ConfigOverlayButton';

import UIActions from 'src/stores/alt/actions/UIActions';

import UIStore from 'src/stores/alt/stores/UIStore';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { capitalizeWords } from 'src/utilities/textHelper';

const ElementsTableSettings = ({ visible: visibleProp, hidden: hiddenProp }) => {
  const { userStore } = useContext(StoreContext);
  const [visible, setVisible] = useState(visibleProp);
  const [hidden, setHidden] = useState(hiddenProp);
  const [prevVisibleProp, setPrevVisibleProp] = useState(visibleProp);
  const [prevHiddenProp, setPrevHiddenProp] = useState(hiddenProp);
  const [showSampleExternalLabel, setShowSampleExternalLabel] = useState(false);
  const [showSampleShortLabel, setShowSampleShortLabel] = useState(false);
  const [showSampleName, setShowSampleName] = useState(false);
  const [tableSchemePreviews, setTableSchemePreviews] = useState(
    () => UIStore.getState().showPreviews
  );

  const saveLabelTimeoutRef = useRef(null);
  const labelsRef = useRef({ showSampleExternalLabel, showSampleShortLabel, showSampleName });

  useEffect(() => {
    labelsRef.current = { showSampleExternalLabel, showSampleShortLabel, showSampleName };
  });

  if (visibleProp !== prevVisibleProp || hiddenProp !== prevHiddenProp) {
    setPrevVisibleProp(visibleProp);
    setPrevHiddenProp(hiddenProp);
    setVisible(visibleProp);
    setHidden(hiddenProp);
  }

  const saveLabels = useCallback(() => {
    saveLabelTimeoutRef.current = null;
    userStore.updateUserProfileValues({
      show_external_name: labelsRef.current.showSampleExternalLabel,
      show_sample_short_label: labelsRef.current.showSampleShortLabel,
      show_sample_name: labelsRef.current.showSampleName,
    });
  }, [userStore]);

  const scheduleSaveLabels = useCallback(() => {
    clearTimeout(saveLabelTimeoutRef.current);
    saveLabelTimeoutRef.current = setTimeout(saveLabels, 300);
  }, [saveLabels]);

  useEffect(() => {
    const syncLabelsFromProfile = (profile) => {
      if (profile && !saveLabelTimeoutRef.current) {
        setShowSampleExternalLabel(!!profile.show_external_name);
        setShowSampleName(!!profile.show_sample_name);
        setShowSampleShortLabel(!!profile.show_sample_short_label);
      }
    };

    syncLabelsFromProfile(userStore.profile);

    const disposeReaction = reaction(
      () => userStore.profile,
      (profile) => syncLabelsFromProfile(profile),
    );

    return () => {
      disposeReaction();
      if (saveLabelTimeoutRef.current) {
        clearTimeout(saveLabelTimeoutRef.current);
        saveLabels();
      }
    };
  }, [userStore, saveLabels]);

  useEffect(() => {
    const onChangeUI = (state) => {
      setTableSchemePreviews((prev) => (prev !== state.showPreviews ? state.showPreviews : prev));
    };
    UIStore.listen(onChangeUI);
    return () => UIStore.unlisten(onChangeUI);
  }, []);

  const updateLayout = useCallback(() => {
    const userProfile = userStore.profile;
    if (!userProfile) return;

    const layout = {};
    visible.forEach((value, index) => {
      layout[value] = (index + 1);
    });
    hidden.forEach((value, index) => {
      layout[value] = (-index - 1);
    });

    userStore.updateUserProfileValues({
      ...userProfile,
      data: { ...(userProfile.data || {}), layout },
      show_external_name: showSampleExternalLabel,
      show_sample_short_label: showSampleShortLabel,
      show_sample_name: showSampleName,
    });
  }, [visible, hidden, showSampleExternalLabel, showSampleShortLabel, showSampleName, userStore]);

  const { currentType } = userStore;

  const getTabItem = useCallback(({ item }) => {
    const genericEls = userStore.genericEls || [];
    const genericElement = genericEls.find((el) => el.name === item);

    let icon;
    let label;
    if (genericElement) {
      ({ icon_name: icon, label } = genericElement);
    } else {
      icon = `icon-${item}`;
      label = capitalizeWords(item);
    }

    return (
      <div className="d-flex gap-2 align-items-center">
        <i className={icon} />
        {label}
      </div>
    );
  }, [userStore]);

  const onTabLayoutClose = useCallback(() => {
    clearTimeout(saveLabelTimeoutRef.current);
    saveLabelTimeoutRef.current = null;

    updateLayout();

    if (currentType === 'sample' || currentType === 'reaction') {
      const { showPreviews } = UIStore.getState();
      if (tableSchemePreviews !== showPreviews) {
        UIActions.toggleShowPreviews(tableSchemePreviews);
      }
    }
  }, [currentType, tableSchemePreviews, updateLayout]);

  const handleToggleScheme = () => {
    setTableSchemePreviews((prev) => !prev);
  };

  const handleToggleSampleExt = () => {
    setShowSampleExternalLabel((prev) => !prev);
    scheduleSaveLabels();
  };

  const handleToggleSampleShortLabel = () => {
    setShowSampleShortLabel((prev) => !prev);
    scheduleSaveLabels();
  };

  const handleToggleSampleName = () => {
    setShowSampleName((prev) => !prev);
    scheduleSaveLabels();
  };

  const showSettings = (currentType === 'sample' || currentType === 'reaction');
  const isSample = currentType === 'sample';
  const otherLabelChecked = showSampleExternalLabel || showSampleName;
  const shortLabelDisabled = !otherLabelChecked;
  const shortLabelChecked = shortLabelDisabled ? true : showSampleShortLabel;

  const popoverSettings = ({ close }) => (
    <Popover className="d-flex popover-multi">
      {showSettings && (
        <div className="popover-multi-item">
          <Popover.Header>Settings</Popover.Header>
          <Popover.Body>
            <Form>
              <Form.Check
                type="checkbox"
                onChange={handleToggleScheme}
                checked={tableSchemePreviews}
                label="Show schemes images"
              />
              {isSample && (
                <>
                  <Form.Check
                    type="checkbox"
                    onChange={handleToggleSampleExt}
                    checked={showSampleExternalLabel}
                    label="Show sample external label"
                  />
                  <Form.Check
                    type="checkbox"
                    onChange={handleToggleSampleShortLabel}
                    checked={shortLabelChecked}
                    disabled={shortLabelDisabled}
                    label="Show sample short label"
                  />
                  <Form.Check
                    type="checkbox"
                    onChange={handleToggleSampleName}
                    checked={showSampleName}
                    label="Show sample name"
                  />
                </>
              )}
            </Form>
          </Popover.Body>
        </div>
      )}
      <div className="popover-multi-item">
        <Popover.Header className="d-flex justify-content-between align-items-center">
          Tab Layout
          <CloseButton onClick={close} />
        </Popover.Header>
        <Popover.Body>
          <TabLayoutEditor
            visible={visible}
            hidden={hidden}
            getItemComponent={getTabItem}
            onLayoutChange={(nextVisible, nextHidden) => {
              setVisible(nextVisible);
              setHidden(nextHidden);
            }}
          />
        </Popover.Body>
      </div>
    </Popover>
  );

  return (
    <ConfigOverlayButton popoverSettings={popoverSettings} onClose={onTabLayoutClose} />
  );
};

ElementsTableSettings.propTypes = {
  visible: PropTypes.instanceOf(List).isRequired,
  hidden: PropTypes.instanceOf(List).isRequired,
};

export default observer(ElementsTableSettings);
