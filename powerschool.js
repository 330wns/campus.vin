(() => {
  const dayKeys=['MA','MB','TA','TB','WA','WB','ThA','ThB','FA','FB'];
  const dayNames=['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const dateOnly=(year,month,day)=>`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const clean=value=>(value||'').replace(/\s+/g,' ').trim();
  const htmlDocument=html=>new DOMParser().parseFromString(html,'text/html');
  const minutes=time=>Number(time.slice(0,2))*60+Number(time.slice(3));
  const sortTimes=(a,b)=>minutes(a.start)-minutes(b.start);
  const isoFromCompact=value=>dateOnly(value.slice(0,4),value.slice(4,6),value.slice(6,8));
  const addDays=(iso,n)=>{const d=new Date(`${iso}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
  const weekdayIndex=iso=>(new Date(`${iso}T12:00:00Z`).getUTCDay()+6)%7;
  const matchesDateHeader=text=>{
    const m=text.match(/Today\s+is\s*:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
    return m?dateOnly(m[3],m[1],m[2]):null;
  };
  const anchorFromText=text=>{
    const date=matchesDateHeader(text);
    const label=[...text.matchAll(/\((Monday|Tuesday|Wednesday|Thursday|Friday)\s*-\s*([AB])\)/gi)].at(-1);
    if(!date||!label)return null;
    if(dayNames[weekdayIndex(date)]!==label[1][0].toUpperCase()+label[1].slice(1).toLowerCase())return null;
    return {date,day:label[2].toUpperCase()};
  };
  const msTimes=[
    ['08:25-09:15','09:20-10:05','10:10-10:55','11:00-11:45','11:50-12:35','12:40-13:25','13:30-14:15','14:20-15:05','15:10-16:00'],
    ['08:25-09:15','09:20-10:05','10:10-10:55','11:00-11:45','11:50-12:35','12:40-13:25','13:30-14:15','14:20-15:05','15:10-15:25'],
    ['08:25-09:15','09:20-10:05','10:10-10:55','11:00-11:45','11:50-12:35','12:40-13:25','13:30-14:15','14:20-15:05','15:10-15:25'],
    ['08:25-09:15','09:20-10:05','10:10-10:55','11:00-11:45','11:50-12:35','12:40-13:25','13:30-14:15','14:20-15:05','15:10-15:25'],
    ['09:00-09:45','09:50-10:35','10:40-11:25','11:30-12:15','12:20-13:05','13:10-13:55','14:00-14:45','14:50-15:35','15:40-16:00']
  ].map(day=>day.map(value=>{const [start,end]=value.split('-');return {start,end}}));
  function parseWeek(html){
    if(!html||html.length>3_000_000)throw new Error('Week View copy is empty or too large.');
    const doc=htmlDocument(html);
    const times={};
    const cells=[...doc.querySelectorAll('td[name^="attCell"], .scheduleClass[name^="attCell"]')];
    for(const cell of cells){
      const match=cell.getAttribute('name')?.match(/^attCell(\d{8})$/);
      if(!match||!cell.classList.contains('scheduleClass'))continue;
      const ranges=[...clean(cell.textContent).matchAll(/\b(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})\b/g)];
      const range=ranges.at(-1);
      if(!range)continue;
      const start=`${range[1].padStart(2,'0')}:${range[2]}`;
      const end=`${range[3].padStart(2,'0')}:${range[4]}`;
      if(minutes(start)>=minutes(end))continue;
      const date=isoFromCompact(match[1]);
      times[date]??=[];
      if(!times[date].some(item=>item.start===start&&item.end===end))times[date].push({start,end});
    }
    for(const list of Object.values(times)){
      list.sort(sortTimes);
      if(list.some((time,index)=>index>0&&minutes(list[index-1].end)>minutes(time.start)))throw new Error('Week View has overlapping time slots. Check that it shows one complete school week.');
    }
    if(!Object.keys(times).length)throw new Error('No class times found. On Week View, press ⌘A then ⌘C, or use the HTML file option.');
    const firstDate=Object.keys(times).sort()[0];
    const monday=addDays(firstDate,-weekdayIndex(firstDate));
    if(Object.keys(times).some(date=>date<monday||date>addDays(monday,4)))throw new Error('Week View contains more than one school week. Show just one Monday–Friday week.');
    const text=clean(doc.body?.textContent);
    return {times,monday,anchor:anchorFromText(text),title:clean(doc.title),source:'Week View'};
  }
  function parseMatrix(html){
    if(!html||html.length>3_000_000)throw new Error('Matrix View copy is empty or too large.');
    const doc=htmlDocument(html);
    const table=doc.querySelector('#schedMatrixTable')||[...doc.querySelectorAll('table')].find(t=>/\bMA\b/.test(t.textContent)&&/\bFB\b/.test(t.textContent));
    if(!table)throw new Error('Matrix table not found. On Matrix View, press ⌘A then ⌘C, or use the HTML file option.');
    const schedules={};
    for(const row of table.querySelectorAll('tr')){
      const cells=[...row.children].filter(el=>/^(TD|TH)$/.test(el.tagName));
      const key=clean(cells[0]?.textContent);
      if(!dayKeys.includes(key))continue;
      if(Number(cells[0].getAttribute('rowspan')||1)!==1)throw new Error(`Matrix View has multiple term rows for ${key}. Select the current term first.`);
      let column=0;
      const classes=[];
      for(const cell of cells.slice(1)){
        if(['level1','level2','level3'].some(name=>cell.classList.contains(name)))continue;
        const span=Math.max(1,Number(cell.getAttribute('colspan')||1));
        const subject=clean(cell.querySelector('.sched-course-name')?.textContent);
        if(subject){
          if(span!==1)throw new Error(`Overlapping courses found on ${key}; Campus cannot safely match their times.`);
          const teacher=clean(cell.querySelector('.sched-teacher-name')?.textContent);
          const room=clean(cell.querySelector('.sched-room')?.textContent).replace(/^Room\s*:\s*/i,'');
          classes.push({column,subject,teacher,room});
        }
        column+=span;
      }
      if(schedules[key]&&JSON.stringify(schedules[key])!==JSON.stringify(classes))throw new Error(`Conflicting term rows found for ${key}.`);
      schedules[key]=classes;
    }
    const missing=dayKeys.filter(key=>!schedules[key]?.length);
    if(missing.length)throw new Error(`Matrix View is missing ${missing.join(', ')}. Select the active term and copy the full page.`);
    return {schedules,anchor:anchorFromText(clean(doc.body?.textContent)),title:clean(doc.title),source:'Matrix View'};
  }
  function build(week,matrix,manualAnchor,existing={}){
    if(!week||!matrix)throw new Error('Both PowerSchool pages are needed.');
    const anchor=matrix.anchor||week.anchor||manualAnchor;
    if(!anchor?.date||!['A','B'].includes(anchor.day))throw new Error('Choose one known A/B weekday from the displayed week.');
    const output={};
    const recovered=[];
    for(let weekday=0;weekday<5;weekday++){
      const date=addDays(week.monday,weekday);
      const pair=[dayKeys[weekday*2],dayKeys[weekday*2+1]];
      const columns=[...new Set(pair.flatMap(key=>matrix.schedules[key].map(c=>c.column)))].sort((a,b)=>a-b);
      let times=week.times[date]||[];
      const usable=list=>list.length===columns.length&&list.every((time,index)=>minutes(time.start)<minutes(time.end)&&(index===0||minutes(list[index-1].end)<=minutes(time.start)));
      if(!usable(times)){
        const previous=pair.flatMap(key=>existing[key]||[]).map(c=>({start:c.start,end:c.end}));
        times=[...new Map(previous.map(t=>[`${t.start}-${t.end}`,t])).values()].sort(sortTimes);
        if(!usable(times))throw new Error(`${dayNames[weekday]} has ${columns.length} Matrix periods but ${week.times[date]?.length||0} usable Week View times. Try a normal school week, or keep the existing schedule and correct times manually.`);
        recovered.push(dayNames[weekday]);
      }
      for(const key of pair){
        output[key]=matrix.schedules[key].map(course=>{
          const time=times[columns.indexOf(course.column)];
          return {id:crypto.randomUUID(),subject:course.subject,teacher:course.teacher,room:course.room,start:time.start,end:time.end,color:''};
        });
      }
    }
    return {schedules:output,rotation:{date:anchor.date,day:anchor.day,lastSyncedAt:new Date().toISOString()},recovered,weekMonday:week.monday};
  }
  function buildMiddleSchool(matrix,manualAnchor){
    if(!matrix)throw new Error('Copy Matrix View first.');
    const anchor=matrix.anchor||manualAnchor;
    if(!anchor?.date||!['A','B'].includes(anchor.day)||weekdayIndex(anchor.date)>4)throw new Error('Choose one known A/B weekday from this week.');
    const schedules={};
    for(let weekday=0;weekday<5;weekday++){
      const pair=[dayKeys[weekday*2],dayKeys[weekday*2+1]];
      const columns=[...new Set(pair.flatMap(key=>matrix.schedules[key].map(c=>c.column)))].sort((a,b)=>a-b);
      const times=msTimes[weekday];
      if(columns.length!==times.length)throw new Error(`${dayNames[weekday]} has ${columns.length} Matrix periods, but the MS bell schedule has ${times.length}. Check that Matrix View shows the active term.`);
      for(const key of pair)schedules[key]=matrix.schedules[key].map(course=>{
        const time=times[columns.indexOf(course.column)];
        return {id:crypto.randomUUID(),subject:course.subject,teacher:course.teacher,room:course.room,start:time.start,end:time.end,color:''};
      });
    }
    return {schedules,rotation:{date:anchor.date,day:anchor.day,lastSyncedAt:new Date().toISOString()},recovered:[]};
  }
  window.PowerSchoolImport={parseWeek,parseMatrix,build,buildMiddleSchool,dayKeys,dayNames,addDays,weekdayIndex};
})();
