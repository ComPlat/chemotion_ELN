class CreateVessels < ActiveRecord::Migration[6.1]
  def change
    create_table :vessels, id: :uuid do |t|
      t.belongs_to :vessel_template, type: :uuid, index: true
      t.belongs_to :user, index: true

      t.string :name
      t.string :description
      t.string :short_label

      t.timestamps
      t.datetime :deleted_at, index: true
    end
  end
end
