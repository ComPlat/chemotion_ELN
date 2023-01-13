class AnnotationHelper
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