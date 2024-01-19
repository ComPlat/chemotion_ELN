# frozen_string_literal: true

class MixtureComponent < ApplicationRecord
  belongs_to :sampleable, polymorphic: true
  belongs_to :mixture
end
