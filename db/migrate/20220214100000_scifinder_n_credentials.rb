# frozen_string_literal: true

# Create scifinder-n credentials
class ScifinderNCredentials < ActiveRecord::Migration[5.2]
  def self.up
    unless table_exists? :scifinder_n_credentials
      create_table :scifinder_n_credentials do |t|
        t.string :access_token, null: false
        t.string :refresh_token
        t.datetime :expires_at, null: false
        t.integer :created_by, null: false
        t.datetime :updated_at, null: false
      end
      add_index(:scifinder_n_credentials, [:created_by], unique: true, name: 'uni_scifinder_n_credentials')
    end
  end

  def self.down
    drop_table :scifinder_n_credentials if table_exists? :scifinder_n_credentials
  end
end
