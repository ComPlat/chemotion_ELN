FactoryGirl.define do
  factory :research_plan do

    sequence(:name) { |i| "Research plan #{i}" }
    sequence(:description) { |i| { "ops" => [{ "insert" => "Lorem Ipsum ##{i}" }] }}
    sdf_file 'sdf.test'
    svg_file 'svg.test'

    callback(:before_create) do |research_plan|
      research_plan.creator = FactoryGirl.build(:user) unless research_plan.creator
    end
  end
end
