#!/bin/bash
rm test.txt

#Make month tables for temporal searches
YEAR=2015
MONTH=1
while [ $YEAR -lt 2022 ]; do
  let MONTH=1
  while [ $MONTH -lt 13 ]; do
    echo "CREATE TABLE " calendar_$YEAR-$MONTH " ( day INT, article_id FOREIGN KEY REFERENCES articles.article_id ) " >> "test.txt"
    let MONTH=MONTH+1
  done
  let YEAR=YEAR+1
done

#Make letter pair tables for letter searches
alphabet=( A B C D E F G H I J K L M N O P Q R S T U V W X Y Z )
for letter in ${alphabet[@]}; do
  for sub_letter in ${alphabet[@]}; do
    echo "CREATE TABLE" $letter"-"$sub_letter "( word CHAR(50) PRIMARY KEY, article INT FOREIGN KEY REFERENCES articles.article_id )" >> "test.txt"
  done
done

echo "CREATE TABLE master_article_list ( VARCHAR(150) article_title, INT article_id PRIMARY KEY, article_text BLOB )" >> "test.txt"
