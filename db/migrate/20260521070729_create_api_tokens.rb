class CreateApiTokens < ActiveRecord::Migration[6.1]
  def change
    create_table :api_tokens do |t|
      t.string :name
      t.string :token_digest, null: false
      t.references :user, null: false, foreign_key: true
      t.datetime :expires_at
      t.datetime :revoked_at

      t.timestamps
    end

    add_index :api_tokens, :token_digest, unique: true
  end
end
