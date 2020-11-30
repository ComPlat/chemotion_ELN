# frozen_string_literal: true

# This is used to add a new column 'isbn' into table: literatures
class AddIsbn < ActiveRecord::Migration[4.2]
  def change
    add_column :literatures, :isbn, :string
  end
end
