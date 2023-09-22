# frozen_string_literal: true

module ReflectionHelpers
  extend Grape::API::Helpers

  def get_assoziation_name_in_collections(element)
    assoziation_name = "#{element}s"
    assoziation_name = 'cellline_samples' if element == 'cell_line'
    assoziation_name
  end
end
