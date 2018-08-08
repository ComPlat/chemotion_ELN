class UserInstrument < ActiveRecord::Migration
  def change
    create_function :user_instrument
  end
end
