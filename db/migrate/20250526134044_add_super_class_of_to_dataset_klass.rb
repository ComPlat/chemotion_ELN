# frozen_string_literal: true

class AddSuperClassOfToDatasetKlass < ActiveRecord::Migration[6.1]
  def up
    return unless table_exists?(:dataset_klasses)
    return if column_exists?(:dataset_klasses, :super_class_of)

    add_column :dataset_klasses, :super_class_of, :jsonb, null: false, default: {}
    add_index :dataset_klasses, :super_class_of, using: :gin, name: 'index_dataset_klasses_on_super_class_of'
  end

  def down
    return unless table_exists?(:dataset_klasses)

    return unless column_exists?(:dataset_klasses, :super_class_of)

    remove_index :dataset_klasses, name: 'index_dataset_klasses_on_super_class_of', if_exists: true
    remove_column :dataset_klasses, :super_class_of
  end
end
