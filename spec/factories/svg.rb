# frozen_string_literal: true

FactoryBot.define do
  factory :svg, class: String do
    transient do
      fixtures_dir { Rails.root.join('spec/fixtures/svg') }
      extension { 'svg' }
      name { nil }
      filename { name.end_with?(".#{extension}") ? name : "#{name}.#{extension}" }
    end

    initialize_with do
      fixtures_dir.join(filename).read
    end
  end
end
