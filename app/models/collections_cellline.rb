class CollectionsCellline < ApplicationRecord
    acts_as_paranoid
    belongs_to :collection
    belongs_to :cellline_sample
end