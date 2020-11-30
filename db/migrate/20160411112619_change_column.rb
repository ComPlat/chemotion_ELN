class ChangeColumn < ActiveRecord::Migration[4.2]
  def change
    change_column_default :samples, :target_amount_unit, 'g'
  end
end
