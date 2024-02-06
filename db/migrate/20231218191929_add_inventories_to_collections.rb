class AddInventoriesToCollections < ActiveRecord::Migration[6.1]
  def change
    add_reference :collections, :inventory, foreign_key: true
  end
end
