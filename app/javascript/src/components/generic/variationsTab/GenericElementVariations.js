/* eslint-disable react/forbid-prop-types */
import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { ElementVariations as VariationsGrid } from 'chem-generic-ui';
import UserStore from 'src/stores/alt/stores/UserStore';
import ElementVariationFetcher from 'src/fetchers/ElementVariationFetcher';

const NO_SEGMENT_KLASSES = [];

const GenericElementVariations = forwardRef(({ genericEl, onDirty }, ref) => {
  const state = UserStore.getState();
  const userId = (state && state.currentUser && state.currentUser.id) || 'anon';
  const segmentKlasses = (state && state.segmentKlasses) || NO_SEGMENT_KLASSES;

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
