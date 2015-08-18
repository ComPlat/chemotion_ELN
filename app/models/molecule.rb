class Molecule < ActiveRecord::Base
  has_many :samples

  validates_uniqueness_of :inchikey
end
