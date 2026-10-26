# frozen_string_literal: true

# Literals are soft deleted now, removed references must not be listed anymore.
class UpdateFunctionLiteraturesByElementToVersion2 < ActiveRecord::Migration[6.1]
  def change
    update_function :literatures_by_element, version: 2, revert_to_version: 1
  end
end
