# frozen_string_literal: true

class SampleType < ApplicationRecord
  belongs_to :sampleable, polymorphic: true
  belongs_to :sample

  scope :component_stocks, -> { where(component_stock: true) }
  scope :mixture_components, -> { where(sampleable_type: 'Sample', component_stock: false) }

  def component_stock?
    component_stock
  end
end
