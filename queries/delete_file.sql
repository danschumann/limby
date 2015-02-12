DELETE FROM limby_files where
  limby_files.id = :id or
  limby_files.limby_files_id = :id
