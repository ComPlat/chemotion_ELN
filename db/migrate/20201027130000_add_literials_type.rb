class AddLiterialsType < ActiveRecord::Migration
  def change
    add_column :literals, :litype, :string unless column_exists? :literals, :litype
  end
end
