class RemoveDensityNullOnSample < ActiveRecord::Migration
  def change
    change_column_null :samples, :density, true
  end
end
