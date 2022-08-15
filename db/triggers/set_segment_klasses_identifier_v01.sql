create trigger set_segment_klasses_identifier
    after insert on segment_klasses
    for each statement execute function set_segment_klasses_identifier();
