class AddVariationsToReactions < ActiveRecord::Migration[6.1]
  def change
    add_column :reactions, :variations, :jsonb, default: []
  end
end
