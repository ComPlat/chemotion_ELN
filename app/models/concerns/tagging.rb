module Tagging
  extend ActiveSupport::Concern

  included do
    after_create :update_tag

    after_destroy :update_tag
  end

  def update_tag
    taggables = Array.new
    taggables << self.reaction if defined? self.reaction
    taggables << self.sample if defined? self.sample
    taggables << self.wellplate if defined? self.wellplate
    taggables << self.screen if defined? self.screen

    taggables.each do |taggable|
      taggable.update_tag
    end
  end
end
