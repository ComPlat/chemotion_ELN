class Material < Sample
  attr_accessor :reference, :show_label, :equivalent, :container, :position, :waste, :coefficient
end

class MaterialSerializer < SampleSerializer
  attributes :reference, :show_label, :equivalent, :container, :position, :waste, :coefficient
end

class MaterialSerializer::Level0 < SampleSerializer::Level0
  attributes :reference, :show_label, :equivalent, :container, :position, :waste, :coefficient
end

class MaterialSerializer::Level1 < SampleSerializer::Level1
  attributes :reference, :show_label, :equivalent, :container, :position, :waste, :coefficient
end

class MaterialSerializer::Level2 < SampleSerializer::Level2
  attributes :reference, :show_label, :equivalent, :container, :position, :waste, :coefficient
end

class MaterialSerializer::Level3 < SampleSerializer::Level3
  attributes :reference, :show_label, :equivalent, :container, :position, :waste, :coefficient
end

class MaterialSerializer::Level10 < SampleSerializer::Level10
  attributes :reference, :show_label, :equivalent, :container, :position, :waste, :coefficient
end
