class ChangeSampleDensityDefault < ActiveRecord::Migration
  def up
    change_column_default :samples, :density, 0.0
  end

  def down
    change_column_default :samples, :density, 1.0
  end
end
