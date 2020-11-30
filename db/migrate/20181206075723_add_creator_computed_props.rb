class AddCreatorComputedProps < ActiveRecord::Migration[4.2]
  def change
    add_column :computed_props, :creator, :integer, default: 0
    add_column :computed_props, :sample_id, :integer, default: 0
  end
end
