module Entities
    class DatasetKlassEntity < Grape::Entity
      expose :id, :ols_term_id, :label, :desc, :properties_template, :is_active, :place
    end
  end
