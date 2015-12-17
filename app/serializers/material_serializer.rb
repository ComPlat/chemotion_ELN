class Material < Sample
  attr_accessor :reference, :equivalent
end

class MaterialSerializer < SampleSerializer
  attributes :reference, :equivalent
end

class MaterialSerializer::Level0 < SampleSerializer::Level0
  attributes :reference, :equivalent
end

class MaterialSerializer::Level1 < SampleSerializer::Level1
  attributes :reference, :equivalent
end

class MaterialSerializer::Level2 < SampleSerializer::Level2
  attributes :reference, :equivalent
end

class MaterialSerializer::Level3 < SampleSerializer::Level3
  attributes :reference, :equivalent
end

class MaterialSerializer::Level10 < SampleSerializer::Level10
  attributes :reference, :equivalent
end
