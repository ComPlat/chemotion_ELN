class SampleWithResiduesSerializer < ActiveModel::Serializer

  root false

  has_many :residues

  attributes :id, :name, :type, :identifier

  def type
    :sample_with_residues
  end
end
