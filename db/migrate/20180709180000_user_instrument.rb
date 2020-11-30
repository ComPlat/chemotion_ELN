class UserInstrument < ActiveRecord::Migration[4.2]
  def change
    create_function :user_instrument
  end
end
