class CreateElementalCompositions < ActiveRecord::Migration[4.2]
  def self.up
    create_table :elemental_compositions do |t|
      t.integer :sample_id, null: false

      t.string :composition_type, null: false
      t.hstore :data, null: false, default: ''
      t.float :loading

      t.timestamps
    end

    add_index :elemental_compositions, :sample_id

    ActiveRecord::Base.connection.schema_cache.clear!
    ElementalComposition.reset_column_information
    Sample.reset_column_information

    # recalculate elemental compositions
    Sample.find_each do |sample|
      sample.save!
    end

    remove_column :samples, :elemental_analyses
  end

  # please modify the method Sample#init_elemental_compositions before rollback
  def self.down
    add_column :samples, :elemental_analyses, :hstore, null: false, default: ''

    Sample.reset_column_information

    # recalculate elemental compositions
    Sample.find_each do |sample|
      sample.save!
    end

    drop_table :elemental_compositions
  end
end
