class AddLiterialsType < ActiveRecord::Migration[4.2]
  def change
    add_column :literals, :litype, :string unless column_exists? :literals, :litype
  end
end
