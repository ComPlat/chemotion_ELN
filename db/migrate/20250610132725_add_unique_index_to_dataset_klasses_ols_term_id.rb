# frozen_string_literal: true

class AddUniqueIndexToDatasetKlassesOlsTermId < ActiveRecord::Migration[6.1]
  def up
    return unless table_exists?(:dataset_klasses)
    return if index_exists?(:dataset_klasses, :ols_term_id, unique: true)

    add_index :dataset_klasses, :ols_term_id, unique: true, name: 'dataset_klasses_on_ols_term_id_ukey'
  end

  def down
    return unless table_exists?(:dataset_klasses)

    if index_exists?(:dataset_klasses, :ols_term_id, unique: true, name: 'dataset_klasses_on_ols_term_id_ukey')
      remove_index :dataset_klasses, name: 'dataset_klasses_on_ols_term_id_ukey'
    end
  end
end
