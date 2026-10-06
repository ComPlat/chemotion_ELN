# frozen_string_literal: true

class AddRorIdToAffiliations < ActiveRecord::Migration[6.1]
  def change
    add_column :affiliations, :ror_id, :string
  end
end
