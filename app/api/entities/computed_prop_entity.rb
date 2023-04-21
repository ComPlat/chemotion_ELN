# frozen_string_literal: true

module Entities
  class ComputedPropEntity < ApplicationEntity
    with_options(anonymize_below: 0) do
      expose! :data, unless: :displayed_in_list
      expose! :dipol_debye, unless: :displayed_in_list
      expose! :ea, unless: :displayed_in_list
      expose! :homo, unless: :displayed_in_list
      expose! :id
      expose! :lumo, unless: :displayed_in_list
      expose! :max_potential, unless: :displayed_in_list
      expose! :mean_abs_potential, unless: :displayed_in_list
      expose! :mean_potential, unless: :displayed_in_list
      expose! :min_potential, unless: :displayed_in_list
      expose! :molecule_id, unless: :displayed_in_list
      expose! :task_id, unless: :displayed_in_list
      expose! :tddft, unless: :displayed_in_list
      expose! :sample_id
      expose! :status
    end

    expose_timestamps
  end
end
