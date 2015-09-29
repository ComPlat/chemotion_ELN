class Screen < ActiveRecord::Base
  has_many :collections_screens
  has_many :collections, through: :collections_screens

  has_many :wellplates

end
