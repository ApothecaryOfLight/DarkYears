function generate_article() {
  const article_title = "generated title";
  const article_date = "2016-01-01";
  const article_body = "generated text";
  const article = {
    title: article_title,
    date: article_date,
    body: article_body
  }
  return article;
}

function generate_articles_varied( variable ) {
  let letter;
  if( (variable % 2) == 0 ) {
    letter = "A";
  } else {
    letter = "B";
  }
  const article_title = "generated title " + letter;

  let date = new Date( 'June 16, 2015 12:00:00' );
  let future = new Date( date.setDate(Number(variable)+16) );
//  const article_date = 
  let date_formatted = date.toLocaleDateString("en-US");
  let date_arr = date_formatted.split('/');
  let month = date_arr[0];
  let day = date_arr[1];
  let year = date_arr[2];
  if( day < 10 ) { day= "0" + day; }
  if( month < 10 ) { month = "0" + month; }
  const article_date = year + "-" + month + "-" + day;

  const article_body = "generated text " + letter;

  //console.log( article_date );
  return({
    title: article_title,
    date: article_date,
    body: article_body
  });
}
