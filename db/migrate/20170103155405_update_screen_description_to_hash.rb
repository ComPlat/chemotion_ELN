class UpdateScreenDescriptionToHash < ActiveRecord::Migration[4.2]
  class Screen < ActiveRecord::Base
    serialize :description
  end

  def up
    Screen.find_each do |s|
      desc_hash = {
        "ops" => [
          { "insert" => s.description }
        ]
      }
      s.update_column(:description, desc_hash)
    end

    Screen.reset_column_information
  end

  def down
    Screen.find_each do |s|
      desc = s.description["ops"] ? s.description["ops"]["insert"] : ""
      s.update_column(:description, desc)
    end

    Screen.reset_column_information
  end
end
