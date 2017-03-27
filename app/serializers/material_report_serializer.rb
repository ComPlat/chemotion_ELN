class MaterialReportSerializer < MaterialSerializer
  include MaterialLevelReportSerializable
end

class MaterialReportSerializer::Level0 < MaterialSerializer::Level0
  include MaterialLevelReportSerializable
end

class MaterialReportSerializer::Level1 < MaterialSerializer::Level1
  include MaterialLevelReportSerializable
end

class MaterialReportSerializer::Level2 < MaterialSerializer::Level2
  include MaterialLevelReportSerializable
end

class MaterialReportSerializer::Level3 < MaterialSerializer::Level3
  include MaterialLevelReportSerializable
end

class MaterialReportSerializer::Level10 < MaterialSerializer::Level10
  include MaterialLevelReportSerializable
end
