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

    create_table :collections_reactions do |t|
      t.integer :collection_id
      t.integer :reaction_id
      t.index :collection_id
      t.index :reaction_id
    end

    create_table :samples do |t|
      t.string :name
      t.float :amount_value
      t.string :amount_unit
      t.timestamps null: false
    end

    create_table :collections_samples do |t|
      t.integer :collection_id
      t.integer :sample_id
      t.index :collection_id
      t.index :sample_id
    end

    create_table :reactions_starting_material_samples do |t|
      t.integer :reaction_id
      t.integer :sample_id
      t.index :reaction_id
      t.index :sample_id
    end

    create_table :reactions_reactant_samples do |t|
      t.integer :reaction_id
      t.integer :sample_id
      t.index :reaction_id
      t.index :sample_id
    end

    create_table :reactions_product_samples do |t|
      t.integer :reaction_id
      t.integer :sample_id
      t.index :reaction_id
      t.index :sample_id
    end
  end
end
