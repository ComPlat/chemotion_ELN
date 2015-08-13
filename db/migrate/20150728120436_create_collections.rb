class CreateCollections < ActiveRecord::Migration
  def change
    create_table :collections do |t|
      t.integer :user_id, null: false, index: true
      t.string :ancestry, index: true
      t.text :label, null: false

      # permission/sharing specific attributes
      t.integer :shared_by_id
      t.boolean :is_shared,               default: false
      t.integer :permission_level,        default: 0
      t.integer :sample_detail_level,     default: 0
      t.integer :reaction_detail_level,   default: 0
      t.integer :wellplate_detail_level,  default: 0

      t.timestamps null: false
    end

    create_table :reactions do |t|
      t.string :name

      t.timestamps null: false
    end

    create_join_table :collections, :reactions do |t|
      t.index :collection_id
      t.index :reaction_id
    end

    create_table :samples do |t|
      t.string :name

      t.timestamps null: false
    end

    create_join_table :collections, :samples do |t|
      t.index :collection_id
      t.index :sample_id
    end

    create_join_table :reactions, :samples, table_name: 'reactions_starting_material_samples' do |t|
      t.index :reaction_id
      t.index :sample_id
    end

    create_join_table :reactions, :samples, table_name: 'reactions_reactant_samples' do |t|
      t.index :reaction_id
      t.index :sample_id
    end

    create_join_table :reactions, :samples, table_name: 'reactions_product_samples' do |t|
      t.index :reaction_id
      t.index :sample_id
    end
  end
end
