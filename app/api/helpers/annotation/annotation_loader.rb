# frozen_string_literal: true

# Class for loading an annotation of an attachment with the shrine infrastructure
class AnnotationLoader

    def getAnnotationOfAttachment(attachment_id)
        att = Attachment.find(attachment_id);
        raise "could not find annotation of attachment" if isAnnotationJsonAbsent(att.attachment_data);
        locationOfAnnotation=att.attachment_data['derivatives']['annotation']['id'];
        back=File.open(locationOfAnnotation, 'rb') if File.exist?(locationOfAnnotation);
        raise "could not find annotation of attachment (file not found)" if !back;
        return back.read;

    end




    def isAnnotationJsonAbsent(attachment_data)
        return !attachment_data||
            !attachment_data['derivatives']||
            !attachment_data['derivatives']['annotation']||
            !attachment_data['derivatives']['annotation']['id']
    end
end