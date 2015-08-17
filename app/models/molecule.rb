class Molecule < ActiveRecord::Base
  belongs_to :sample

  validates_uniqueness_of :inchikey
end
