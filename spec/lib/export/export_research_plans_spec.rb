# frozen_string_literal: true

require 'rails_helper'
require 'helpers/thumbnail/thumbnail_creator'

describe 'Export::ExportResearchPlan' do
  context 'with research_plan' do
    describe '-> export' do
      it 'export with image in body' do
        rp = create(:research_plan)
        example_svg_annotation = '<svg>example</svg>'
        tempfile = Tempfile.new('annotationFile.svg')
        tempfile.write(example_svg_annotation)
        tempfile.rewind
        tempfile.close

        attachment = create(:attachment,
                           bucket: 1,
                           filename: 'upload.jpg',
                           created_by: 1,
                           attachable_id: rp.id,
                           attachment_data: create_annotation_json(tempfile.path))
        update_body_of_researchplan(rp, attachment.identifier)
        exporter = Export::ExportResearchPlan.new(User.find(rp.created_by), rp, 'not relevant')

        file_location = extract_file_location(exporter.to_relative_html)
        assert_equal(file_location, attachment.attachment_data['id'])
      end
    end
  end

  def extract_file_location(html)
    left_part = html.split("src='")[1]
    left_part.split("'>")[0]
  end

  def update_body_of_researchplan(research_plan, identifier_of_attachment)
    research_plan.body = [
      {
        "id": 'entry-003',
        "type": 'image',
        "value": {
          "file_name": 'xyz.png',
          "public_name": identifier_of_attachment
        }
      }
    ]
    research_plan.save!
    research_plan
  end

  def create_annotation_json(location)
    tempfile = Tempfile.new('example.png')
    str = '{'\
        ' "id": "' + tempfile.path + '",'\
        '"storage": "store",'\
        '"metadata": {'\
        '    "size": 29111,'\
        '   "filename": "example.png",'\
        '    "mime_type": null'\
        '},'\
        '"derivatives": {'\
        '    "annotation": {'\
        '        "id": "' + location + '",'\
        '        "storage": "store",'\
        '        "metadata": {'\
        '            "size": 480,'\
        '            "filename": "example_annotation.svg",'\
        '            "mime_type": null'\
        '        }}}}'
    JSON.parse(str)
  end
end
