/* eslint-disable react/forbid-prop-types */
import React, {
  forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState,
} from 'react';
import PropTypes from 'prop-types';
import {
  Alert, Button, ButtonGroup, Spinner,
} from 'react-bootstrap';
import { ElementVariations as VariationsGrid } from 'chem-generic-ui';
import { StoreContext } from 'src/stores/mobx/RootStore';
import ElementVariationFetcher from 'src/fetchers/ElementVariationFetcher';

const NO_SEGMENT_KLASSES = [];

const GenericElementVariations = forwardRef(({ genericEl, onDirty }, ref) => {
  const { userStore } = useContext(StoreContext);
  const userId = userStore.currentUser.id || 'anon';
  const segmentKlasses = userStore.segmentKlasses || NO_SEGMENT_KLASSES;

  return (
    <VariationsGrid
      ref={ref}
      genericEl={genericEl}
      onDirty={onDirty}
      fetcher={ElementVariationFetcher}
      segmentKlasses={segmentKlasses}
      userId={userId}
    />
  );
});

GenericElementVariations.displayName = 'GenericElementVariations';

GenericElementVariations.propTypes = {
  genericEl: PropTypes.object.isRequired,
  onDirty: PropTypes.func,
};

GenericElementVariations.defaultProps = {
  onDirty: null,
};

export default GenericElementVariations;
