class SharedUserAsJson < ActiveRecord::Migration
  def change
    create_function :shared_user_as_json
  end
end
