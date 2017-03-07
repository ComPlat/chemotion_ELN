class SampleReportSerializer
end

class SampleReportSerializer::Level10 < SampleSerializer::Level10
  include SampleLevelReportSerializable
end

class SampleReportSerializer::Level0 < SampleSerializer::Level0
  include SampleLevelReportSerializable
  define_restricted_methods_for_level(0)
end

class SampleReportSerializer::Level1 < SampleSerializer::Level1
  include SampleLevelReportSerializable
  define_restricted_methods_for_level(1)
end

class SampleReportSerializer::Level2 < SampleSerializer::Level2
  include SampleLevelReportSerializable
  define_restricted_methods_for_level(2)
end

class SampleReportSerializer::Level3 < SampleSerializer::Level3
  include SampleLevelReportSerializable
  define_restricted_methods_for_level(3)
end
