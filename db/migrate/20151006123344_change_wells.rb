class ChangeWells < ActiveRecord::Migration
  def change
    change_column_null :wells, :sample_id, true
  end
end
