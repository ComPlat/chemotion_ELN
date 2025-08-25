# frozen_string_literal: true

class CollectionShare < ApplicationRecord
  belongs_to :collection
  belongs_to :shared_with, class_name: "User"
end
