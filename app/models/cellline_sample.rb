class CelllineSample < ApplicationRecord
    acts_as_paranoid
    belongs_to :cell_line_sample, optional: true
    belongs_to :cellline_material
    belongs_to :creator, class_name: "User", foreign_key: "user_id"
end
