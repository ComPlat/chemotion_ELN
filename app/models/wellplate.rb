require 'ElementUIStateScopes'

class Wellplate < ActiveRecord::Base
  include ElementUIStateScopes

  has_many :collections_wellplates
  has_many :collections, through: :collections_wellplates

  has_many :wells
  #belongs_to :screen

  before_destroy :destroy_associations

  def destroy_associations
    Well.where(wellplate_id: id).destroy_all

    # WARNING: Using delete_all instead of destroy_all due to PG Error
    # TODO: Check this error and consider another solution
    CollectionsWellplate.where(wellplate_id: id).delete_all
  end

  def samples
    wells.flat_map(&:sample)
  end
end
