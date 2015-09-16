class Wellplate < ActiveRecord::Base
  has_many :collections_wellplates
  has_many :collections, through: :collections_wellplates

  # TODO not implemented yet!
end
