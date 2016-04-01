module Chemotion::PeriodicTable
  yml_path = Rails.root + 'lib/chemotion/elements.yaml'
  data = YAML.load File.open yml_path
  ELEMENTS = data.symbolize_keys

  def self.get_atomic_weight el_sym
    ELEMENTS[el_sym.to_sym].try :to_d
  end
end
