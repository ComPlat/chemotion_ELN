class AddReactionNamePrefixToUser < ActiveRecord::Migration[4.2]
  def change
    add_column :users, :reaction_name_prefix, :string, default: 'R', limit: 3
  end
end
