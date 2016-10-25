class UpdateReactionDescriptionToHash < ActiveRecord::Migration
  class Reaction < ActiveRecord::Base
      serialize :description
    end

    def up
      Reaction.find_each do |r|
        desc_hash = {
          "ops" => [
            { "insert" => r.description }
          ]
        }
        r.update_column(:description, desc_hash)
      end

      Reaction.reset_column_information
    end

    def down
      Reaction.find_each do |r|
        desc = r.description["ops"] ? r.description["ops"]["insert"] : ""
        r.update_column(:description, desc)
      end

      Reaction.reset_column_information
    end
end
