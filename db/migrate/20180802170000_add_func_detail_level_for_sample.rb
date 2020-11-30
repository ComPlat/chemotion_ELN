class AddFuncDetailLevelForSample < ActiveRecord::Migration[4.2]
  def change
    create_function :detail_level_for_sample
  end
end
