import NotificationActions from 'src/stores/alt/actions/NotificationActions';

/**
 * Utility to calculate the total used volume (by components)
 * @param {Sample} sample
 * @returns {number}
 */
export function getTotalUsedVolume(sample) {
  const componentVolume = (sample.components || [])
    .filter((c) => c.material_group === 'liquid')
    .reduce((sum, c) => sum + (parseFloat(c.amount_l) || 0), 0);
  const solventVolume = (sample.solvent || [])
    .reduce((sum, s) => sum + (parseFloat(s.amount_l) || 0), 0);
  return componentVolume + solventVolume;
}

/**
 * Utility to check if the sum of all component volumes exceeds the total sample volume and notify
 * @param {Sample} sample
 * @returns {boolean} true if valid, false if exceeded
 */
export function checkComponentVolumeAndNotify(sample) {
  const totalVolume = sample.amount_l || 0;
  const usedVolume = getTotalUsedVolume(sample);
  if (usedVolume > totalVolume && totalVolume > 0) {
    NotificationActions.add({
      title: 'Volume Exceeded',
      message: 'The sum of all component volumes exceeds the total sample volume.',
      level: 'warning',
      position: 'tr',
      autoDismiss: 5,
    });
    return false;
  }
  return true;
}
