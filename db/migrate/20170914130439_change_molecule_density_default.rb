class ChangeMoleculeDensityDefault < ActiveRecord::Migration
  def up
    change_column_default :molecules, :density, 0.0
  end

  def down
    change_column_default :molecules, :density, 1.0
  end
end
