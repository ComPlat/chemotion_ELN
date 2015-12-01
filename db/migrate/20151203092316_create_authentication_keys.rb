class CreateAuthenticationKeys < ActiveRecord::Migration
  def change
    create_table :authentication_keys do |t|
      t.string :token, null: false
    end
  end
end
