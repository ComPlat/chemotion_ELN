# frozen_string_literal: true

# Switching the unit of a gas product's turnover frequency (TOF) in the scheme tab converted the value
# as if it were a duration: TON/h -> TON/m multiplied by 60 instead of dividing, and so on round the
# cycle. The conversion is fixed (convertTurnoverFrequency in
# app/javascript/src/utilities/UnitsConversion.js); this repairs what it stored.
#
# A TOF is never entered, only derived: the client sets it to the turnover number divided by the gas
# phase time, in the time unit of the TOF (Sample#updateTONPerTimeValue), whenever time, ppm,
# temperature, vessel size or catalyst change. The unit switch was the one step that did not go
# through that. So every stored TOF is recomputed the same way, and rewritten where it differs.
class RecomputeGasProductTurnoverFrequencies < ActiveRecord::Migration[6.1]
  # The table as it is, without the model's STI, soft deletion or callbacks.
  class ReactionsSampleRow < ActiveRecord::Base
    self.table_name = 'reactions_samples'
    self.inheritance_column = nil
  end

  GAS_TYPE_GAS = 3
  SECONDS_PER = { 's' => 1, 'm' => 60, 'h' => 3600 }.freeze

  def up
    ReactionsSampleRow.where(gas_type: GAS_TYPE_GAS).where.not(gas_phase_data: nil).find_each do |row|
      data = row.gas_phase_data
      tof = recomputed_tof(data)
      next if tof.nil? || same?(number(data.dig('turnover_frequency', 'value')), tof)

      data['turnover_frequency'] = data['turnover_frequency'].merge('value' => tof)
      row.update_columns(gas_phase_data: data) # rubocop:disable Rails/SkipsModelValidations
    end
  end

  # The wrong values are not kept anywhere, and would be wrong to restore.
  def down; end

  private

  def recomputed_tof(data)
    return nil unless data.is_a?(Hash) && data['turnover_frequency'].is_a?(Hash)

    ton = number(data['turnover_number'])
    time = time_in_tof_unit(data)
    ton && time ? ton / time : nil
  end

  # The gas phase time in the time unit the TOF is per, or nil without a usable one.
  def time_in_tof_unit(data)
    time = number(data.dig('time', 'value'))
    time_seconds = SECONDS_PER[data.dig('time', 'unit')]
    tof_seconds = SECONDS_PER[data.dig('turnover_frequency', 'unit').to_s.split('/').last]
    return nil unless time&.positive? && time_seconds && tof_seconds

    time * time_seconds / tof_seconds
  end

  def same?(stored, computed)
    !stored.nil? && (stored - computed).abs <= 1e-9 * [stored.abs, computed.abs, 1].max
  end

  def number(value)
    return nil if value.nil? || value == ''

    number = Float(value, exception: false)
    number&.finite? ? number : nil
  end
end
