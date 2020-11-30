class ChangeWells < ActiveRecord::Migration[4.2]
  def change
    change_column_null :wells, :sample_id, true
  end
end
