class DropMixtureTable < ActiveRecord::Migration[6.1]
  def change
    drop_table :mixtures, force: :cascade
    drop_table :mixture_components, force: :cascade
  end
end
