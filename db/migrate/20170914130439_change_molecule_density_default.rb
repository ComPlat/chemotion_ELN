class ChangeMoleculeDensityDefault < ActiveRecord::Migration[4.2]
  def up
    change_column_default :molecules, :density, 0.0
  end

  def down
    change_column_default :molecules, :density, 1.0
  end
end
