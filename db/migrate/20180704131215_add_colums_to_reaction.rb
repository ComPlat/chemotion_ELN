class AddColumsToReaction < ActiveRecord::Migration
  def change
    add_column :reactions, :rinchi_string, :text
    add_column :reactions, :rinchi_long_key, :text
    add_column :reactions, :rinchi_short_key, :string
    add_column :reactions, :rinchi_web_key, :string

    add_index :reactions, :rinchi_web_key
  end
end
