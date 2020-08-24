create trigger update_users_matrix_trg
    after insert or update on matrices
    for each row execute procedure update_users_matrix();
