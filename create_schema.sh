#!/bin/bash
rm -f create_schema.sql

echo "DROP DATABASE IF EXISTS DarkYearsDB;" >> create_schema.sql
echo "CREATE DATABASE IF NOT EXISTS DarkYearsDB;" >> create_schema.sql
echo "USE DarkYearsDB;" >> create_schema.sql

echo "CREATE TABLE articles( article_title VARCHAR(150) NOT NULL, article_id INT PRIMARY KEY, article_text LONGTEXT, article_date DATE );" >> create_schema.sql

#Make month tables for temporal searches - when db becomes too large
#YEAR=2015
#MONTH=1
#ZERO=0
#while [ $YEAR -lt 2022 ]; do
#  let MONTH=1
#  while [ $MONTH -lt 13 ]; do
#    if [ $MONTH -lt 10 ]; then
#      ZERO=0
#    else
#      ZERO=""
#    fi
#    echo "CREATE TABLE calendar_"$YEAR"_"$ZERO$MONTH " ( day INT, article_id_fk INT, article_title VARCHAR(150), FOREIGN KEY (article_id_fk) REFERENCES articles(article_id) ON DELETE CASCADE ); " >> "create_schema.sql"
#    let MONTH=MONTH+1
#  done
#  let YEAR=YEAR+1
#done

#Date search table
echo "CREATE TABLE calendar ( date_stamp DATE NOT NULL, article_id_fk INT NOT NULL, article_title VARCHAR(150) NOT NULL, FOREIGN KEY (article_id_fk) REFERENCES articles(article_id) ON DELETE CASCADE, INDEX (date_stamp) );" >> create_schema.sql


#Make letter pair tables for letter searches - when db becomes too large
#alphabet=( A B C D E F G H I J K L M N O P Q R S T U V W X Y Z )
#for letter in ${alphabet[@]}; do
#  for sub_letter in ${alphabet[@]}; do
#    echo "CREATE TABLE" $letter"_"$sub_letter "( word CHAR(50), article_id_fk INT, article_title VARCHAR(150), FOREIGN KEY (article_id_fk) REFERENCES articles(article_id) ON DELETE CASCADE );" >> "create_schema.sql"
#  done
#done

#Word search table
echo "CREATE TABLE words ( word CHAR(150) NOT NULL, article_id_fk INT NOT NULL, FOREIGN KEY (article_id_fk) REFERENCES articles(article_id) ON DELETE CASCADE, INDEX (word));" >> create_schema.sql


#Credentials
echo "CREATE USER IF NOT EXISTS 'DarkYears_User'@'localhost' IDENTIFIED BY 'DarkYears_Password';" >> create_schema.sql
echo "GRANT ALL ON DarkYearsDB.* TO 'DarkYears_User'@'localhost';" >> create_schema.sql


#Identity manager
echo "CREATE TABLE sequence_last( last BIGINT NOT NULL );" >> create_schema.sql
echo "CREATE TABLE sequence_retired( retired_id BIGINT NOT NULL );" >> create_schema.sql
echo "INSERT INTO sequence_last (last) VALUES (0);" >> create_schema.sql
#Identity manager function
echo "DELIMITER %%" >> create_schema.sql
echo "CREATE FUNCTION DarkYearsDB.generate_new_id()" >> create_schema.sql
echo "RETURNS BIGINT" >> create_schema.sql
echo "NOT DETERMINISTIC" >> create_schema.sql
echo "CONTAINS SQL" >> create_schema.sql
echo "READS SQL DATA" >> create_schema.sql
echo "BEGIN" >> create_schema.sql
echo "DECLARE RetiredID BIGINT;" >> create_schema.sql
echo "DECLARE LastID BIGINT;" >> create_schema.sql
echo "SET @RetiredID = (SELECT retired_id FROM sequence_retired LIMIT 1);" >> create_schema.sql
echo "SET @LastID = (SELECT last FROM sequence_last LIMIT 1);" >> create_schema.sql
echo "IF @RetiredID IS NULL THEN UPDATE sequence_last SET last = last + 1;" >> create_schema.sql
echo "ELSE DELETE FROM sequence_retired WHERE retired_id = @RetiredID;" >> create_schema.sql
echo "END IF;" >> create_schema.sql
echo "SET @NewID = COALESCE( @RetiredID, @LastID );" >> create_schema.sql
echo "RETURN @NewID;" >> create_schema.sql
echo "END" >> create_schema.sql
echo "%%" >> create_schema.sql
echo "DELIMITER ;" >> create_schema.sql


#Users table
echo "CREATE TABLE users( username VARCHAR(150) NOT NULL, username_hash VARBINARY(64) NOT NULL, password_hash VARBINARY(64) NOT NULL, user_settings TEXT, PRIMARY KEY(username_hash) );" >> create_schema.sql


#Contact table
echo "CREATE TABLE contact( name VARCHAR(150), org VARCHAR(250), phone VARCHAR(50), email VARCHAR(150), message LONGTEXT );" >> create_schema.sql


echo "All done!"
