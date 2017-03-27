class UpdateWellplateDescriptionToHash < ActiveRecord::Migration
  class Wellplate < ActiveRecord::Base
    serialize :description
  end

  def up
    Wellplate.find_each do |w|
      desc_hash = {
        "ops" => [
          { "insert" => w.description }
        ]
      }
      w.update_column(:description, desc_hash)
    end

    Wellplate.reset_column_information
  end

  def down
    Wellplate.find_each do |w|
      desc = w.description["ops"] ? w.description["ops"]["insert"] : ""
      w.update_column(:description, desc)
    end

    Wellplate.reset_column_information
  end
end
