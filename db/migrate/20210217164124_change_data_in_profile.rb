class ChangeDataInProfile < ActiveRecord::Migration[4.2]
  def change
    change_column_default :profiles, :data, '{}'
    change_column_null :profiles, :data, false, '{}'
  end
end
