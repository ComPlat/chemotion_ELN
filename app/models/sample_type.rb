# frozen_string_literal: true

class SampleType < ApplicationRecord
  belongs_to :sampleable, polymorphic: true
  belongs_to :sample
end
