#frozen_string_literal: true

require 'helpers/annotation/annotation_loader';
require_relative 'annotation_helper.rb';

describe AnnotationLoader do
    context '-> annotations' do

        describe '-> get' do
            it '-> of non existing attachment' do
                expect {
                    loader=AnnotationLoader.new;
                    loader.getAnnotationOfAttachment(1);
                }.to raise_error  ("Couldn't find Attachment with 'id'=1")
            end

            it '-> of attachment without annotation' do
                expect {
                    helper=AnnotationHelper.new;
                    attachment=helper.createAttachmentWithoutAnnotation();
                    attachment.save;
                    loader=AnnotationLoader.new;
                    loader.getAnnotationOfAttachment(attachment.id);
                }.to raise_error  ("could not find annotation of attachment")
            end

            it '-> of attachment with annotation but without file' do

                expect {
                    helper=AnnotationHelper.new;
                    attachment=helper.createAttachmentWithAnnotation('/nothingHere/xxx.svg');
                    attachment.save;
                    loader=AnnotationLoader.new;
                    svgData=loader.getAnnotationOfAttachment(attachment.id);
                }.to raise_error  ("could not find annotation of attachment (file not found)")
            end

            it '-> of attachment with annotation and file' do
                    helper=AnnotationHelper.new;
                    exampleSvgAnnotation="<svg>example</svg>";
                    tempfile = Tempfile.new('annotationFile.svg')
                    tempfile.write(exampleSvgAnnotation);
                    tempfile.rewind;
                    tempfile.close;
                    attachment=helper.createAttachmentWithAnnotation(tempfile.path);
                    attachment.save;
                    loader=AnnotationLoader.new;
                    svgData=loader.getAnnotationOfAttachment(attachment.id);
                    assert_equal(exampleSvgAnnotation,svgData) ;
                    tempfile.unlink;
            end
        end
    end
end