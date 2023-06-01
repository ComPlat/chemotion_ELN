module Entities
    class CellLineSampleEntity < Grape::Entity 
        expose :id
        expose :amount
        expose :passage
        expose :contamination
        expose :source
        expose :growth_medium
        expose :name
        expose :short_label
        expose :description
        expose :cellline_material 
    end
end