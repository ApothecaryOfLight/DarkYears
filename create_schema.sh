#!/bin/bash
rm create_schema.sql

#Make month tables for temporal searches
YEAR=2015
MONTH=1
while [ $YEAR -lt 2022 ]; do
  let MONTH=1
  while [ $MONTH -lt 13 ]; do
    echo "CREATE TABLE " calendar_$YEAR_$MONTH " ( day INT, article_id_fk INT, article_title VARCHAR(150), FOREIGN KEY article_id_fk REFERENCES articles(article_id) ON DELETE CASCADE ); " >> "create_schema.sql"
    let MONTH=MONTH+1
  done
  let YEAR=YEAR+1
done

#Make letter pair tables for letter searches
alphabet=( A B C D E F G H I J K L M N O P Q R S T U V W X Y Z )
for letter in ${alphabet[@]}; do
  for sub_letter in ${alphabet[@]}; do
    echo "CREATE TABLE" $letter"_"$sub_letter "( word CHAR(50) PRIMARY KEY, article_id_fk INT, article_title VARCHAR(150), FOREIGN KEY article_id_fk REFERENCES (articles)article_id ON DELETE CASCADE );" >> "create_schema.sql"
  done
done

echo "CREATE TABLE articles( article_title VARCHAR(150), article_id INT PRIMARY KEY, article_text BLOB  );" >> "create_schema.sql"
