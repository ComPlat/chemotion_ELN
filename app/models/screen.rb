require 'ElementUIStateScopes'

class Screen < ActiveRecord::Base
  include ElementUIStateScopes

  has_many :collections_screens
  has_many :collections, through: :collections_screens

  has_many :wellplates
end
