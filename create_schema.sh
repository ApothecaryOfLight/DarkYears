\#!/bin/bash
rm create_schema.sql

echo "DROP DATABASE IF EXISTS DarkYearsDB;" >> "create_schema.sql"
echo "CREATE DATABASE IF NOT EXISTS DarkYearsDB;" >> "create_schema.sql"
echo "USE DarkYearsDB;" >> "create_schema.sql"

echo "CREATE TABLE articles( article_title VARCHAR(150), article_id INT PRIMARY KEY, article_text LONGTEXT );" >> "create_schema.sql"

#Make month tables for temporal searches
YEAR=2015
MONTH=1
while [ $YEAR -lt 2022 ]; do
  let MONTH=1
  while [ $MONTH -lt 13 ]; do
    echo "CREATE TABLE calendar_"$YEAR"_"$MONTH " ( day INT, article_id_fk INT, article_title VARCHAR(150), FOREIGN KEY (article_id_fk) REFERENCES articles(article_id) ON DELETE CASCADE ); " >> "create_schema.sql"
    let MONTH=MONTH+1
  done
  let YEAR=YEAR+1
done

#Make letter pair tables for letter searches
alphabet=( A B C D E F G H I J K L M N O P Q R S T U V W X Y Z )
for letter in ${alphabet[@]}; do
  for sub_letter in ${alphabet[@]}; do
    echo "CREATE TABLE" $letter"_"$sub_letter "( word CHAR(50) PRIMARY KEY, article_id_fk INT, article_title VARCHAR(150), FOREIGN KEY (article_id_fk) REFERENCES articles(article_id) ON DELETE CASCADE );" >> "create_schema.sql"
  done
done

echo "CREATE USER IF NOT EXISTS 'DarkYears_User'@'localhost' IDENTIFIED BY 'DarkYears_Password';" >> "create_schema.sql"
echo "GRANT ALL ON DarkYearsDB.* TO 'DarkYears_User'@'localhost'" >> create_schema.sql

echo "DELIMITER $$ \
CREATE FUNCTION DarkYearsDB.generate_new_id() \
RETURNS BIGINT \
NOT DETERMINISTIC \
CONTAINS SQL \
READS SQL DATA \
BEGIN \
DECLARE RetiredID BIGINT; \
DECLARE LastID BIGINT; \
SET @RetiredID = (SELECT retired_id FROM sequence_retired LIMIT 1); \
SET @LastID = (SELECT last FROM sequence_last LIMIT 1); \
IF @RetiredID IS NULL THEN UPDATE sequence_last SET last = last + 1; \
ELSE DELETE FROM sequence_retired WHERE retired_id = @RetiredID; \
END IF; \
SET @NewID = COALESCE( @RetiredID, @LastID ); \
RETURN @NewID; \
END$$ \
DELIMITER ;" >> create_schema.sql
