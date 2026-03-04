class AddTokensToUsers < ActiveRecord::Migration[6.1]
  def change
    add_column :users, :tokens, :jsonb
  end
end
