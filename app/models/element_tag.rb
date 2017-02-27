class ElementTag < ActiveRecord::Base
  belongs_to :taggable, polymorphic: true
end
