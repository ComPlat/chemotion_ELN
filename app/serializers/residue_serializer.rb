class ResidueSerializer < ActiveModel::Serializer
  attributes :id, :residue_type, :custom_info
  root false
end
