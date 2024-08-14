class AdaptReactionsSamples < ActiveRecord::Migration[6.1]
  def change
    add_column :reactions_samples, :gas_type, :integer, default: 0, null: true
    add_column :reactions_samples, :gas_phase_data, :jsonb, default: {
      part_per_million: nil,
      turnover_number: nil,
      turnover_frequency: { value: nil, unit: 'TON/h' },
      time: { value: nil, unit: 'h' },
      temperature: { value: nil, unit: '°C' }
    }, null: true
  end
end
