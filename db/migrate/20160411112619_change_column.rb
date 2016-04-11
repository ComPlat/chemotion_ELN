class ChangeColumn < ActiveRecord::Migration
  def change
    change_column_default :samples, :target_amount_unit, 'g'
  end
end
