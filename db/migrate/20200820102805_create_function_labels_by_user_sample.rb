class CreateFunctionLabelsByUserSample < ActiveRecord::Migration
  def change
    create_function :labels_by_user_sample
  end
end
