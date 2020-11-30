class CreateAffiliations < ActiveRecord::Migration[4.2]
  def change
    create_table :affiliations do |t|
      t.string :company
      t.string :country
      t.string :organization
      t.string :department
      t.string :group

      t.timestamps
    end
  end
end
