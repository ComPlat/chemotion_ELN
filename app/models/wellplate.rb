class Wellplate < ActiveRecord::Base
  has_many :collections_wellplates
  has_many :collections, through: :collections_wellplates

  has_many :wells
  #belongs_to :screen

  def samples
    wells.flat_map(&:sample)
  end
end
