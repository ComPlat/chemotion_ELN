class AddReactionConditions < ActiveRecord::Migration[4.2]
  def change
    remove_column :reactions,    :conditions if column_exists? :reactions, :conditions
    add_column :reactions, :conditions, :string
  end
end
