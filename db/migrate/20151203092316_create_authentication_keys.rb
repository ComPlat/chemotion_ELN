class CreateAuthenticationKeys < ActiveRecord::Migration[4.2]
  def change
    create_table :authentication_keys do |t|
      t.string :token, null: false
    end
  end
end
