#frozen_string_literal: true

require 'helpers/annotation/annotation_updater';
require_relative 'annotation_helper.rb';


describe AnnotationUpdater do
    context '-> annotations' do
        describe '-> update' do
            it '-> of non existing attachment' do
                expect {
                    helper=AnnotationUpdater.new;
                    helper.updateAnnotation('',1);
                }.to raise_error  ("Couldn't find Attachment with 'id'=1")
            end

            it '-> success' do
                helper=AnnotationHelper.new;
                exampleSvgAnnotation="<svg>example</svg>";
                tempfile = Tempfile.new('annotationFile.svg')
                tempfile.write(exampleSvgAnnotation);
                tempfile.rewind;
                tempfile.close;
                attachment=helper.createAttachmentWithAnnotation(tempfile.path);
                attachment.save;
                helper=AnnotationUpdater.new;
                helper.updateAnnotation("<svg>edited - example</svg>",attachment.id);

                file=File.open(attachment.attachment_data['derivatives']['annotation']['id']);
                data=file.read;
                assert_equal("<svg>edited - example</svg>",data);

                tempfile.unlink;
            end
        end
    end
end