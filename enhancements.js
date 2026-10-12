(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast = msg => { const el=$('toast'); if(!el)return; el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2800); };

  // Calendar / planner: kept in its own storage key so existing RPG progress remains intact.
  const CAL_KEY='studyRPGCalendarEvents';
  let events=[];
  try { const saved=JSON.parse(localStorage.getItem(CAL_KEY)||'[]'); if(Array.isArray(saved)) events=saved.filter(e=>e&&typeof e.title==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)); } catch {}
  let viewed=new Date(); viewed.setDate(1);
  let selectedDate=today();
  const saveEvents=()=>localStorage.setItem(CAL_KEY,JSON.stringify(events));
  const monthKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const dateLabel=value=>new Date(value+'T12:00:00').toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'long'});
  function renderCalendar(){
    if(!$('calendarGrid')) return;
    $('calendarMonthLabel').textContent=viewed.toLocaleDateString('vi-VN',{month:'long',year:'numeric'});
    const first=new Date(viewed.getFullYear(),viewed.getMonth(),1);
    const offset=(first.getDay()+6)%7;
    const count=new Date(viewed.getFullYear(),viewed.getMonth()+1,0).getDate();
    const cells=[];
    for(let i=0;i<offset;i++) cells.push('<span class="calendar-day empty"></span>');
    for(let n=1;n<=count;n++){
      const date=`${viewed.getFullYear()}-${String(viewed.getMonth()+1).padStart(2,'0')}-${String(n).padStart(2,'0')}`;
      const num=events.filter(e=>e.date===date).length;
      cells.push(`<button type="button" class="calendar-day ${date===today()?'today':''} ${date===selectedDate?'selected':''} ${num?'has-events':''}" data-calendar-date="${date}"><span>${n}</span>${num?`<i>${num}</i>`:''}</button>`);
    }
    $('calendarGrid').innerHTML=cells.join('');
    $('calendarGrid').querySelectorAll('[data-calendar-date]').forEach(b=>b.addEventListener('click',()=>{selectedDate=b.dataset.calendarDate;$('calendarDate').value=selectedDate;renderCalendar();renderEvents();}));
    renderEvents();
  }
  function renderEvents(){
    if(!$('calendarEventList'))return;
    const chosen=events.filter(e=>e.date===selectedDate).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    $('calendarSelectedLabel').textContent=selectedDate===today()?'Kế hoạch hôm nay':dateLabel(selectedDate);
    $('calendarEventCount').textContent=`${chosen.length} mục`;
    $('calendarEventList').innerHTML=chosen.length?chosen.map(e=>`<article class="calendar-event"><div class="calendar-event-date">${e.time?escapeHTML(e.time):'Cả ngày'}</div><div class="calendar-event-copy"><strong>${escapeHTML(e.title)}</strong><small>${escapeHTML(e.subject||'Khác')}</small></div><button type="button" class="calendar-delete" data-event-delete="${escapeHTML(e.id)}" aria-label="Xóa kế hoạch">×</button></article>`).join(''):'<div class="website-list-empty">Chưa có kế hoạch cho ngày này. Thêm một mục ở biểu mẫu phía trên nhé.</div>';
    $('calendarEventList').querySelectorAll('[data-event-delete]').forEach(b=>b.addEventListener('click',()=>{events=events.filter(e=>e.id!==b.dataset.eventDelete);saveEvents();renderCalendar();toast('Đã xóa kế hoạch.');}));
  }
  if($('calendarForm')){
    $('calendarDate').value=today();
    $('calendarForm').addEventListener('submit',e=>{e.preventDefault();const title=$('calendarTitle').value.trim(),date=$('calendarDate').value;if(!title||!date)return;events.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),title,date,subject:$('calendarSubject').value,time:$('calendarTime').value||''});selectedDate=date;viewed=new Date(date+'T12:00:00');viewed.setDate(1);saveEvents();$('calendarTitle').value='';$('calendarTime').value='';renderCalendar();toast('Đã lưu kế hoạch học tập.');});
    $('calendarPrev').addEventListener('click',()=>{viewed.setMonth(viewed.getMonth()-1);renderCalendar();});
    $('calendarNext').addEventListener('click',()=>{viewed.setMonth(viewed.getMonth()+1);renderCalendar();});
    renderCalendar();
  }

  // Dock Focus shortcut enters a focused view; Escape exits it.
  const focusBtn=$('focusModeBtn');
  function setFocusMode(enabled){document.body.classList.toggle('focus-mode',enabled);if(focusBtn)focusBtn.textContent=enabled?'✕ Thoát Focus':'⛶ Focus Mode';}
  if(focusBtn) focusBtn.addEventListener('click',()=>setFocusMode(!document.body.classList.contains('focus-mode')));
  document.querySelectorAll('[data-dock-page="home"]').forEach(btn=>{if(btn.title==='Pomodoro / Tập trung')btn.addEventListener('click',()=>{setFocusMode(true);document.getElementById('page-home')?.scrollIntoView({behavior:'smooth'});});});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setFocusMode(false);});

  // Search saved website links without changing their persistent storage.
  const search=$('websiteSearch');
  if(search) search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();document.querySelectorAll('#websiteList .website-link-card').forEach(card=>{card.hidden=!card.textContent.toLowerCase().includes(q);});});

  // Import full backups, including RPG state, website links, and planner events.
  const importInput=$('importBackupFile');
  if(importInput) importInput.addEventListener('change',async()=>{
    const file=importInput.files&&importInput.files[0];if(!file)return;
    try{
      const parsed=JSON.parse(await file.text());
      if(parsed&&parsed.app==='Study RPG macOS'&&parsed.data&&typeof parsed.data==='object'){
        if(!confirm('Khôi phục bản sao lưu sẽ thay thế tiến độ, website và lịch học hiện tại. Tiếp tục?')){importInput.value='';return;}
        localStorage.setItem('studyRPGUltra',JSON.stringify(parsed.data));
        localStorage.setItem('studyRPGWebsiteLinks',JSON.stringify(Array.isArray(parsed.websiteLinks)?parsed.websiteLinks:[]));
        localStorage.setItem(CAL_KEY,JSON.stringify(Array.isArray(parsed.calendarEvents)?parsed.calendarEvents:[]));
      } else if(parsed&&typeof parsed==='object'&&('xp' in parsed||'history' in parsed||'coins' in parsed)) {
        if(!confirm('Đây là bản sao lưu Study RPG cũ. Khôi phục sẽ thay thế tiến độ hiện tại. Tiếp tục?')){importInput.value='';return;}
        localStorage.setItem('studyRPGUltra',JSON.stringify(parsed));
      } else { throw new Error('unsupported'); }
      alert('Đã khôi phục dữ liệu. Study RPG sẽ tải lại.');location.reload();
    }catch(err){alert('Không đọc được bản sao lưu. Hãy chọn file JSON được xuất từ Study RPG.');importInput.value='';}
  });
})();
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast = msg => { const el=$('toast'); if(!el)return; el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2800); };

  // Calendar / planner: kept in its own storage key so existing RPG progress remains intact.
  const CAL_KEY='studyRPGCalendarEvents';
  let events=[];
  try { const saved=JSON.parse(localStorage.getItem(CAL_KEY)||'[]'); if(Array.isArray(saved)) events=saved.filter(e=>e&&typeof e.title==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)); } catch {}
  let viewed=new Date(); viewed.setDate(1);
  let selectedDate=today();
  const saveEvents=()=>localStorage.setItem(CAL_KEY,JSON.stringify(events));
  const monthKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const dateLabel=value=>new Date(value+'T12:00:00').toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'long'});
  function renderCalendar(){
    if(!$('calendarGrid')) return;
    $('calendarMonthLabel').textContent=viewed.toLocaleDateString('vi-VN',{month:'long',year:'numeric'});
    const first=new Date(viewed.getFullYear(),viewed.getMonth(),1);
    const offset=(first.getDay()+6)%7;
    const count=new Date(viewed.getFullYear(),viewed.getMonth()+1,0).getDate();
    const cells=[];
    for(let i=0;i<offset;i++) cells.push('<span class="calendar-day empty"></span>');
    for(let n=1;n<=count;n++){
      const date=`${viewed.getFullYear()}-${String(viewed.getMonth()+1).padStart(2,'0')}-${String(n).padStart(2,'0')}`;
      const num=events.filter(e=>e.date===date).length;
      cells.push(`<button type="button" class="calendar-day ${date===today()?'today':''} ${date===selectedDate?'selected':''} ${num?'has-events':''}" data-calendar-date="${date}"><span>${n}</span>${num?`<i>${num}</i>`:''}</button>`);
    }
    $('calendarGrid').innerHTML=cells.join('');
    $('calendarGrid').querySelectorAll('[data-calendar-date]').forEach(b=>b.addEventListener('click',()=>{selectedDate=b.dataset.calendarDate;$('calendarDate').value=selectedDate;renderCalendar();renderEvents();}));
    renderEvents();
  }
  function renderEvents(){
    if(!$('calendarEventList'))return;
    const chosen=events.filter(e=>e.date===selectedDate).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    $('calendarSelectedLabel').textContent=selectedDate===today()?'Kế hoạch hôm nay':dateLabel(selectedDate);
    $('calendarEventCount').textContent=`${chosen.length} mục`;
    $('calendarEventList').innerHTML=chosen.length?chosen.map(e=>`<article class="calendar-event"><div class="calendar-event-date">${e.time?escapeHTML(e.time):'Cả ngày'}</div><div class="calendar-event-copy"><strong>${escapeHTML(e.title)}</strong><small>${escapeHTML(e.subject||'Khác')}</small></div><button type="button" class="calendar-delete" data-event-delete="${escapeHTML(e.id)}" aria-label="Xóa kế hoạch">×</button></article>`).join(''):'<div class="website-list-empty">Chưa có kế hoạch cho ngày này. Thêm một mục ở biểu mẫu phía trên nhé.</div>';
    $('calendarEventList').querySelectorAll('[data-event-delete]').forEach(b=>b.addEventListener('click',()=>{events=events.filter(e=>e.id!==b.dataset.eventDelete);saveEvents();renderCalendar();toast('Đã xóa kế hoạch.');}));
  }
  if($('calendarForm')){
    $('calendarDate').value=today();
    $('calendarForm').addEventListener('submit',e=>{e.preventDefault();const title=$('calendarTitle').value.trim(),date=$('calendarDate').value;if(!title||!date)return;events.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),title,date,subject:$('calendarSubject').value,time:$('calendarTime').value||''});selectedDate=date;viewed=new Date(date+'T12:00:00');viewed.setDate(1);saveEvents();$('calendarTitle').value='';$('calendarTime').value='';renderCalendar();toast('Đã lưu kế hoạch học tập.');});
    $('calendarPrev').addEventListener('click',()=>{viewed.setMonth(viewed.getMonth()-1);renderCalendar();});
    $('calendarNext').addEventListener('click',()=>{viewed.setMonth(viewed.getMonth()+1);renderCalendar();});
    renderCalendar();
  }

  // Dock Focus shortcut enters a focused view; Escape exits it.
  const focusBtn=$('focusModeBtn');
  function setFocusMode(enabled){document.body.classList.toggle('focus-mode',enabled);if(focusBtn)focusBtn.textContent=enabled?'✕ Thoát Focus':'⛶ Focus Mode';}
  if(focusBtn) focusBtn.addEventListener('click',()=>setFocusMode(!document.body.classList.contains('focus-mode')));
  document.querySelectorAll('[data-dock-page="home"]').forEach(btn=>{if(btn.title==='Pomodoro / Tập trung')btn.addEventListener('click',()=>{setFocusMode(true);document.getElementById('page-home')?.scrollIntoView({behavior:'smooth'});});});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setFocusMode(false);});

  // Search saved website links without changing their persistent storage.
  const search=$('websiteSearch');
  if(search) search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();document.querySelectorAll('#websiteList .website-link-card').forEach(card=>{card.hidden=!card.textContent.toLowerCase().includes(q);});});

  // Import full backups, including RPG state, website links, and planner events.
  const importInput=$('importBackupFile');
  if(importInput) importInput.addEventListener('change',async()=>{
    const file=importInput.files&&importInput.files[0];if(!file)return;
    try{
      const parsed=JSON.parse(await file.text());
      if(parsed&&parsed.app==='Study RPG macOS'&&parsed.data&&typeof parsed.data==='object'){
        if(!confirm('Khôi phục bản sao lưu sẽ thay thế tiến độ, website và lịch học hiện tại. Tiếp tục?')){importInput.value='';return;}
        localStorage.setItem('studyRPGUltra',JSON.stringify(parsed.data));
        localStorage.setItem('studyRPGWebsiteLinks',JSON.stringify(Array.isArray(parsed.websiteLinks)?parsed.websiteLinks:[]));
        localStorage.setItem(CAL_KEY,JSON.stringify(Array.isArray(parsed.calendarEvents)?parsed.calendarEvents:[]));
      } else if(parsed&&typeof parsed==='object'&&('xp' in parsed||'history' in parsed||'coins' in parsed)) {
        if(!confirm('Đây là bản sao lưu Study RPG cũ. Khôi phục sẽ thay thế tiến độ hiện tại. Tiếp tục?')){importInput.value='';return;}
        localStorage.setItem('studyRPGUltra',JSON.stringify(parsed));
      } else { throw new Error('unsupported'); }
      alert('Đã khôi phục dữ liệu. Study RPG sẽ tải lại.');location.reload();
    }catch(err){alert('Không đọc được bản sao lưu. Hãy chọn file JSON được xuất từ Study RPG.');importInput.value='';}
  });
})();
