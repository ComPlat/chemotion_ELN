# frozen_string_literal: true

class AllowNullableInventoryFields < ActiveRecord::Migration[6.1]
  def change
    change_column_null :inventories, :prefix, true
    change_column_null :inventories, :name, true
  end
end 