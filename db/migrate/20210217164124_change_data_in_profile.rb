class ChangeDataInProfile < ActiveRecord::Migration
  def change
    change_column_default :profiles, :data, '{}'
    change_column_null :profiles, :data, false, '{}'
  end
end
