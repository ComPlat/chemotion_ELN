# frozen_string_literal: true

require 'rails_helper'
require 'helpers/thumbnail/thumbnail_creator'

describe 'Export::ExportResearchPlan' do
  context '-> research_plan' do
    describe '-> export' do
      it '-> with image in body' do
        user = create_and_save_user
        rp = create_and_save_reseachplan(user)

        example_svg_annotation = '<svg>example</svg>'
        tempfile = Tempfile.new('annotationFile.svg')
        tempfile.write(example_svg_annotation)
        tempfile.rewind
        tempfile.close

        attachment = create_attachment_without_annotation(rp.id, tempfile)
        attachment.save!
        update_body_of_researchplan(rp, attachment.identifier)

        exporter = Export::ExportResearchPlan.new(user, rp, 'not relevant')

        file_location = extract_file_location(exporter.to_relative_html)
        assert_equal(file_location, attachment.attachment_data['id'])
      end
    end
  end

  def create_and_save_user
    user = User.new
    user.email = 'FakeEmail@mail.de'
    user.password = '123456789'
    user.first_name = 'First'
    user.last_name = 'Last'
    user.name = 'Name'
    user.name_abbreviation = 'FMA'
    user.save!
    user
  end

  def extract_file_location(html)
    left_part = html.split("src='")[1]
    left_part.split("'>")[0]
  end

  def create_and_save_reseachplan(user)
    rp = ResearchPlan.new
    rp.creator = user
    rp.name = 'ABC'
    rp.body = {}
    rp.save!
    rp
  end

  def update_body_of_researchplan(rp, identifier_of_attachment)
    rp.body = [
      {
        "id": 'entry-003',
        "type": 'image',
        "value": {
          "file_name": 'xyz.png',
          "public_name": identifier_of_attachment
        }
      }
    ]
    rp.save!
    rp
  end

  def create_attachment_without_annotation(researchplan_id, tempfile)
    attachment = Attachment.new(
      bucket: 1,
      filename: 'test',
      file_path: 'tmp',
      created_by: 1,
      created_for: 1,
      content_type: 'svg',
      attachable_type: 1,
      attachable_id: researchplan_id
    )
    attachment.attachment_data = createAnnotationJson(tempfile.path)
    attachment
  end

  def createAnnotationJson(location)
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
