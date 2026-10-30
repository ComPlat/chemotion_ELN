# frozen_string_literal: true

class CreateProvenance < ActiveRecord::Migration[6.1]
  def change
    create_table :provenances, id: :uuid do |t|
      t.uuid :reaction_process_id

      t.datetime :starts_at
      t.string :city
      t.string :doi
      t.string :patent
      t.string :publication_url
      t.string :username
      t.string :name
      t.string :orcid
      t.string :organization
      t.string :email

      t.timestamps
    end
  end
end
