# frozen_string_literal: true

class Mixture < ApplicationRecord
  has_one :sample, as: :sampleable
  has_many :mixture_components
  has_many :components, through: :mixture_components, source: :sample
end
