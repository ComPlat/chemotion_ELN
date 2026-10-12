# frozen_string_literal: true

class CreateMedia < ActiveRecord::Migration[6.1]
  def change
    create_table :media, id: :uuid do |t|
      t.string :type
      t.string :sum_formula
      t.string :sample_name
      t.string :molecule_name

      t.timestamps
    end
  end
end
