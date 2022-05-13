class CreateToken < ActiveRecord::Migration[5.2]
  def change
    create_table :tokens do |t|
      t.string :token
      t.string :refresh_token
      t.string :client_id
      t.string :client_name
      t.datetime :created_at
      t.datetime :updated_at
      t.references :user, index: true, foreign_key: true
    end
  end
end
