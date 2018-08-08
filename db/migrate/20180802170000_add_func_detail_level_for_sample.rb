class AddFuncDetailLevelForSample < ActiveRecord::Migration
  def change
    create_function :detail_level_for_sample
  end
end
