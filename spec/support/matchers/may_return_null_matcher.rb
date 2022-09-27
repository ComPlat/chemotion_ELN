# frozen_string_literal: true

RSpec::Matchers.define :may_return_null do |field_name|
  match do |klass|
    !klass.get_field(field_name.to_s.camelcase(:lower)).type.instance_of?(GraphQL::Schema::NonNull)
  end
end
