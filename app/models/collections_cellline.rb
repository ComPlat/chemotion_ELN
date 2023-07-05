# frozen_string_literal: true

class CollectionsCellline < ApplicationRecord
  acts_as_paranoid
  belongs_to :collection
  belongs_to :cellline_sample

  include Tagging
  include Collecting
end
