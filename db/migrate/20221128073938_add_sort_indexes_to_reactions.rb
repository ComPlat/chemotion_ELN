class AddSortIndexesToReactions < ActiveRecord::Migration[5.2]
  def change
    add_index :reactions, :rinchi_short_key, order: { rinchi_short_key: :desc }
    add_index :reactions, :rxno, order: { rxno: :desc }
  end
end
