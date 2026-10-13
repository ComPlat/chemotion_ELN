# frozen_string_literal: true

require 'rails_helper'

# Rich-text fields reach the docx reports as HTML (Reporter::Delta). Sablon
# renders <ul>/<ol> with the paragraph styles ListBullet/ListNumber and clones
# the w:abstractNum bound to that style, so every shipped template that may
# receive rich text must define both.
RSpec.describe 'docx report templates' do # rubocop:disable RSpec/DescribeClass
  list_styles = %w[ListBullet ListNumber]

  %w[Standard Supporting_information Spectra].each do |name|
    describe "#{name}.docx" do
      let(:model) do
        Zip::File.open(Rails.root.join('lib', 'template', "#{name}.docx").to_s) do |zip|
          Sablon::DOM::Model.new(zip)
        end
      end
      let(:styles) { model.zip_contents['word/styles.xml'] }

      list_styles.each do |style|
        it "defines the #{style} paragraph style" do
          expect(styles.at_xpath("//w:style[@w:type='paragraph'][@w:styleId='#{style}']")).to be_present
        end

        it "can create a list numbering for #{style}" do
          definition = model.add_list_definition(style)
          expect(definition.style).to eq(style)
        end
      end
    end
  end
end
