# frozen_string_literal: true

class CreateAffiliationSuggestions < ActiveRecord::Migration[6.1]
  def up
    create_table :affiliation_suggestions do |t|
      t.integer :user_id, null: false
      t.string :organization
      t.string :department
      t.string :group
      t.string :country
      t.integer :status, default: 0, null: false
      t.integer :affiliation_id
      t.string :ror_id
      t.integer :target_user_affiliation_id
      t.date :from
      t.date :to

      t.timestamps
    end

    add_index :affiliation_suggestions, :user_id
    add_index :affiliation_suggestions, :status
    add_foreign_key :affiliation_suggestions, :users
  end

  def down
    drop_table :affiliation_suggestions
  end
end
