# frozen_string_literal: true

class Mixture < ApplicationRecord
  has_many :mixture_components, as: :sampleable
  has_many :components, through: :mixture_components, source: :component, source_type: 'Mixture'
end
