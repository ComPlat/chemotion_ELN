class AddMultipleReadoutsToWell < ActiveRecord::Migration[5.2]
  def up
    add_column :wells, :readouts, :jsonb, default: [{"value": "", "unit": ""}]

    add_column :wellplates, :readout_titles, :jsonb, default: ["Readout"]

    Well.reset_column_information
    Well.where.not(readout: nil).find_each do |w|
      w.update_columns(
        readouts: [
          {
            description: 'Readout',
            value: w.readout,
            unit: ''
          }
        ]
      )
    end
    remove_column :wells, :readout
  end
end
