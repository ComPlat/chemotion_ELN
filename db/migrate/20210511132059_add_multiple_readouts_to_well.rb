class AddMultipleReadoutsToWell < ActiveRecord::Migration[5.2]
  def change
    add_column :wells, :readouts, :jsonb, default: [{"value": "", "unit": ""}]

    add_column :wellplates, :readout_titles, :jsonb, default: ["Readout"]

    Well.where.not(readout: nil).each do |w|
      w.update_attributes(
        readouts: [
          {
            description: 'Readout',
            value: w.readout,
            unit: ''
          }
        ]
      )
    end
  end
end
