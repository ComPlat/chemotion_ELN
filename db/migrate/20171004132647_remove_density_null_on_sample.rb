class RemoveDensityNullOnSample < ActiveRecord::Migration[4.2]
  def change
    change_column_null :samples, :density, true
  end
end
