// Drive the real three-part editor while keeping fixture dates in storage format.
export async function fillBirthday(page,value){const [year='',month='',day='']=value.split('-');for(const [part,text] of [['day',day],['month',month],['year',year]])await page.getByRole('textbox',{name:`Birthday ${part}`,exact:true}).fill(text);}
