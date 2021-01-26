#!/bin/bash
rm create_schema.sql

echo "DROP DATABASE IF EXISTS DarkYearsDB;" >> "create_schema.sql"
echo "CREATE DATABASE IF NOT EXISTS DarkYearsDB;" >> "create_schema.sql"
echo "USE DarkYearsDB;" >> "create_schema.sql"

echo "CREATE TABLE articles( article_title VARCHAR(150), article_id INT PRIMARY KEY, article_text LONGTEXT, article_date DATE );" >> "create_schema.sql"

#Make month tables for temporal searches
YEAR=2015
MONTH=1
ZERO=0
while [ $YEAR -lt 2022 ]; do
  let MONTH=1
  while [ $MONTH -lt 13 ]; do
    if [ $MONTH -lt 10 ]; then
      ZERO=0
    else
      ZERO=""
    fi
    echo "CREATE TABLE calendar_"$YEAR"_"$ZERO$MONTH " ( day INT, article_id_fk INT, article_title VARCHAR(150), FOREIGN KEY (article_id_fk) REFERENCES articles(article_id) ON DELETE CASCADE ); " >> "create_schema.sql"
    let MONTH=MONTH+1
  done
  let YEAR=YEAR+1
done

#Make letter pair tables for letter searches
alphabet=( A B C D E F G H I J K L M N O P Q R S T U V W X Y Z )
for letter in ${alphabet[@]}; do
  for sub_letter in ${alphabet[@]}; do
    echo "CREATE TABLE" $letter"_"$sub_letter "( word CHAR(50), article_id_fk INT, article_title VARCHAR(150), FOREIGN KEY (article_id_fk) REFERENCES articles(article_id) ON DELETE CASCADE );" >> "create_schema.sql"
  done
done

echo "CREATE TABLE sequence_last( last BIGINT );" >> create_schema.sql
echo "CREATE TABLE sequence_retired( retired_id BIGINT );" >> create_schema.sql
echo "INSERT INTO sequence_last (last) VALUES (0);" >> create_schema.sql

echo "CREATE USER IF NOT EXISTS 'DarkYears_User'@'localhost' IDENTIFIED BY 'DarkYears_Password';" >> "create_schema.sql"
echo "GRANT ALL ON DarkYearsDB.* TO 'DarkYears_User'@'localhost'" >> create_schema.sql

rm create_schema_function.sql
echo "DELIMITER %%" >> create_schema_function.sql
echo "CREATE FUNCTION DarkYearsDB.generate_new_id()" >> create_schema_function.sql
echo "RETURNS BIGINT" >> create_schema_function.sql
echo "NOT DETERMINISTIC" >> create_schema_function.sql
echo "CONTAINS SQL" >> create_schema_function.sql
echo "READS SQL DATA" >> create_schema_function.sql
echo "BEGIN" >> create_schema_function.sql
echo "DECLARE RetiredID BIGINT;" >> create_schema_function.sql
echo "DECLARE LastID BIGINT;" >> create_schema_function.sql
echo "SET @RetiredID = (SELECT retired_id FROM sequence_retired LIMIT 1);" >> create_schema_function.sql
echo "SET @LastID = (SELECT last FROM sequence_last LIMIT 1);" >> create_schema_function.sql
echo "IF @RetiredID IS NULL THEN UPDATE sequence_last SET last = last + 1;" >> create_schema_function.sql
echo "ELSE DELETE FROM sequence_retired WHERE retired_id = @RetiredID;" >> create_schema_function.sql
echo "END IF;" >> create_schema_function.sql
echo "SET @NewID = COALESCE( @RetiredID, @LastID );" >> create_schema_function.sql
echo "RETURN @NewID;" >> create_schema_function.sql
echo "END" >> create_schema_function.sql
echo "%%" >> create_schema_function.sql
echo "DELIMITER ;" >> create_schema_function.sql
