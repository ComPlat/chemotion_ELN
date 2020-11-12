class ComputedPropsSerializer < ActiveModel::Serializer
  attributes :id, :sample_id, :status, :updated_at

  def updated_at
    object.updated_at.strftime("%m/%d/%Y %H:%M")
  end
end
