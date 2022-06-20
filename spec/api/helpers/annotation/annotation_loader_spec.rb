#frozen_string_literal: true

require 'helpers/annotation/annotation_loader';

describe AnnotationLoader do
    context '-> annotations' do

        describe '-> get' do
            it '-> of non existing attachment' do
                expect {
                    helper=AnnotationLoader.new;
                    helper.getAnnotationOfAttachment(1);
                }.to raise_error  ("Couldn't find Attachment with 'id'=1")
            end

            it '-> of attachment without annotation' do
                expect {
                    attachment=createAttachmentWithoutAnnotation();
                    attachment.save;
                    helper=AnnotationLoader.new;
                    helper.getAnnotationOfAttachment(attachment.id);
                }.to raise_error  ("could not find annotation of attachment")
            end

            it '-> of attachment with annotation but without file' do

                expect {
                    attachment=createAttachmentWithAnnotation('/nothingHere/xxx.svg');
                    attachment.save;
                    helper=AnnotationLoader.new;
                    svgData=helper.getAnnotationOfAttachment(attachment.id);
                }.to raise_error  ("could not find annotation of attachment (file not found)")
            end

            it '-> of attachment with annotation and file' do
                    exampleSvgAnnotation="<svg>example</svg>";
                    tempfile = Tempfile.new('annotationFile.svg')
                    tempfile.write(exampleSvgAnnotation);
                    tempfile.rewind;
                    tempfile.close;
                    attachment=createAttachmentWithAnnotation(tempfile.path);
                    attachment.save;
                    helper=AnnotationLoader.new;
                    svgData=helper.getAnnotationOfAttachment(attachment.id);
                    assert_equal(exampleSvgAnnotation,svgData) ;
                    tempfile.unlink;



            end
        end
    end


    def createAttachmentWithoutAnnotation()
        attachment = Attachment.new(
            bucket: 1,
            filename: 'test',
            file_path: 'tmp',
            created_by: 1,
            created_for: 1,
            content_type: 'svg',
            attachable_type: 1,
            attachable_id: 1
          )
        attachment
    end

    def createAttachmentWithAnnotation(location)
        attachment=createAttachmentWithoutAnnotation();
        attachment.attachment_data=createAnnotationJson(location);
        attachment

    end



    def createAnnotationJson(location)
        tempfile = Tempfile.new('example.png')
        str='{'\
            ' "id": "'+tempfile.path+'",'\
            '"storage": "store",'\
            '"metadata": {'\
            '    "size": 29111,'\
            '   "filename": "example.png",'\
            '    "mime_type": null'\
            '},'\
            '"derivatives": {'\
            '    "annotation": {'\
            '        "id": "'+location+'",'\
            '        "storage": "store",'\
            '        "metadata": {'\
            '            "size": 480,'\
            '            "filename": "example_annotation.svg",'\
            '            "mime_type": null'\
            '        }}}}';
      JSON.parse(str);
    end
end





