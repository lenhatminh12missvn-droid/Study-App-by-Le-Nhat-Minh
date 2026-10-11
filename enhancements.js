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
  const saveEvents=()=>{localStorage.setItem(CAL_KEY,JSON.stringify(events));window.dispatchEvent(new CustomEvent('study-rpg-local-change'));};
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


  // AI quiz generator with persistent duplicate prevention.
  const QUIZ_HISTORY_KEY='studyRPGAIQuizQuestionHistoryV1';
  let quizHistory=[];
  try{const raw=JSON.parse(localStorage.getItem(QUIZ_HISTORY_KEY)||'[]');if(Array.isArray(raw))quizHistory=raw.filter(x=>typeof x==='string').slice(-1000);}catch{}
  let activeAIQuiz=[]; let quizSubmitted=false;
  const normalizeQuestion=s=>String(s||'').toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();
  const saveQuizHistory=()=>{quizHistory=Array.from(new Set(quizHistory)).slice(-1000);localStorage.setItem(QUIZ_HISTORY_KEY,JSON.stringify(quizHistory));window.dispatchEvent(new CustomEvent('study-rpg-local-change'));if($('aiQuizHistoryCount'))$('aiQuizHistoryCount').textContent=`${quizHistory.length} câu đã ghi nhận`;};
  const setQuizStatus=t=>{if($('aiQuizStatus'))$('aiQuizStatus').textContent=t;};
  function renderAIQuiz(){
    const out=$('aiQuizOutput');if(!out)return;
    if(!activeAIQuiz.length){out.innerHTML='<div class="empty-state"><strong>Chưa có quiz</strong><p>Hãy chọn thiết lập và tạo quiz mới.</p></div>';return;}
    const answered=activeAIQuiz.filter(q=>q.selected!==undefined).length;
    out.innerHTML=`<div class="muted">${escapeHTML($('aiQuizGrade').value)} · ${escapeHTML($('aiQuizSubject').value)} · ${activeAIQuiz.length} câu${$('aiQuizTopic').value.trim()?' · '+escapeHTML($('aiQuizTopic').value.trim()):''}</div>`+
      activeAIQuiz.map((q,i)=>`<div class="aiquiz-question"><h3>${i+1}. ${escapeHTML(q.question)}</h3><div class="aiquiz-options">${q.options.map((opt,j)=>`<label class="aiquiz-option ${quizSubmitted&&j===q.answer?'correct':''} ${quizSubmitted&&q.selected===j&&j!==q.answer?'wrong':''}"><input type="radio" name="aiq${i}" value="${j}" ${q.selected===j?'checked':''} ${quizSubmitted?'disabled':''}><span><b>${'ABCD'[j]}.</b> ${escapeHTML(opt)}</span></label>`).join('')}</div>${quizSubmitted?`<p class="aiquiz-explanation"><b>${q.selected===q.answer?'Chính xác!':'Đáp án: '+('ABCD'[q.answer])+'.'}</b> ${escapeHTML(q.explanation||'')}</p>`:''}</div>`).join('')+
      (quizSubmitted?`<div class="aiquiz-score"><strong>Kết quả: ${activeAIQuiz.filter(q=>q.selected===q.answer).length}/${activeAIQuiz.length} câu đúng</strong><p class="muted">${Math.round(activeAIQuiz.filter(q=>q.selected===q.answer).length/activeAIQuiz.length*100)}% · Câu hỏi đã được ghi vào lịch sử chống trùng.</p></div><div class="aiquiz-actions"><button class="primary-btn" type="button" id="aiQuizAgain">Tạo quiz khác</button></div>`:`<div class="aiquiz-actions"><button class="primary-btn" type="button" id="aiQuizSubmit">Chấm điểm (${answered}/${activeAIQuiz.length} đã chọn)</button></div>`);
    if(!quizSubmitted){out.querySelectorAll('input[type=radio]').forEach(el=>el.addEventListener('change',()=>{activeAIQuiz[Number(el.name.slice(3))].selected=Number(el.value);renderAIQuiz();}));$('aiQuizSubmit').addEventListener('click',()=>{if(activeAIQuiz.some(q=>q.selected===undefined)){toast('Hãy trả lời tất cả câu hỏi trước khi chấm.');return;}quizSubmitted=true;setQuizStatus('Đã chấm điểm');renderAIQuiz();});}
    else $('aiQuizAgain').addEventListener('click',()=>$('aiQuizForm').requestSubmit());
  }
  async function generateAIQuiz(e){
    e.preventDefault();const apiKey=$('aiQuizKey').value.trim();if(!apiKey){alert('Hãy nhập Gemini API key để tạo câu hỏi bằng AI. Key chỉ được giữ trong phiên hiện tại.');$('aiQuizKey').focus();return;}
    const grade=$('aiQuizGrade').value,subject=$('aiQuizSubject').value,topic=$('aiQuizTopic').value.trim()||'các kiến thức trọng tâm phù hợp chương trình',count=Number($('aiQuizCount').value),difficulty=$('aiQuizDifficulty').value;
    const button=$('aiQuizGenerate');button.disabled=true;button.textContent='Đang tạo câu hỏi…';setQuizStatus('Đang gọi AI');$('aiQuizOutput').innerHTML='<div class="aiquiz-loading"><span class="spinner"></span>AI đang soạn câu hỏi mới và kiểm tra lịch sử…</div>';
    try{
      const recent=quizHistory.slice(-160).map((q,i)=>`${i+1}. ${q}`).join('\n');
      const prompt=`Bạn là giáo viên ra đề chính xác bằng tiếng Việt. Tạo đúng ${count} câu hỏi trắc nghiệm cho ${grade}, môn ${subject}, chủ đề: ${topic}. Độ khó: ${difficulty}. Phù hợp chương trình phổ thông Việt Nam. Mỗi câu có đúng 4 lựa chọn, chỉ 1 đáp án đúng, không mơ hồ. Tuyệt đối tránh trùng lặp hoặc diễn đạt lại câu hỏi cũ bên dưới.\nCÂU ĐÃ DÙNG:\n${recent||'(chưa có)'}\nChỉ trả về JSON hợp lệ, không markdown, theo schema: {"questions":[{"question":"...","options":["...","...","...","..."],"answer":0,"explanation":"..."}]}. answer là chỉ số từ 0 đến 3.`;
      const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key='+encodeURIComponent(apiKey),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',temperature:0.9}})});
      const payload=await response.json();if(!response.ok)throw new Error(payload?.error?.message||`Gemini API lỗi (${response.status})`);
      const text=payload?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';
      const data=JSON.parse(text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
      if(!Array.isArray(data.questions))throw new Error('AI không trả về danh sách câu hỏi hợp lệ.');
      const seen=new Set(quizHistory.map(normalizeQuestion));
      const fresh=data.questions.filter(q=>q&&typeof q.question==='string'&&Array.isArray(q.options)&&q.options.length===4&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4&&!seen.has(normalizeQuestion(q.question)));
      if(fresh.length<count){throw new Error(`AI chỉ tạo được ${fresh.length}/${count} câu mới không trùng lịch sử. Hãy đổi chủ đề hoặc xóa lịch sử nếu bạn muốn làm lại.`);}
      activeAIQuiz=fresh.slice(0,count).map(q=>({question:q.question,options:q.options.map(String),answer:q.answer,explanation:String(q.explanation||''),selected:undefined}));
      activeAIQuiz.forEach(q=>quizHistory.push(normalizeQuestion(q.question)));saveQuizHistory();quizSubmitted=false;setQuizStatus('Đã tạo '+activeAIQuiz.length+' câu mới');renderAIQuiz();toast('Đã tạo quiz mới, không trùng các câu đã lưu.');
    }catch(err){$('aiQuizOutput').innerHTML=`<div class="empty-state"><strong>Không thể tạo quiz</strong><p>${escapeHTML(err.message||'Đã xảy ra lỗi. Hãy kiểm tra mạng và API key.')}</p><p class="muted">Nếu trình duyệt chặn yêu cầu khi mở file trực tiếp, hãy chạy ứng dụng qua localhost. Không chia sẻ API key cho người khác.</p></div>`;setQuizStatus('Có lỗi');}
    finally{button.disabled=false;button.textContent='✦ Tạo quiz mới';}
  }
  
  // Lưu Gemini API key trên trình duyệt hiện tại
  const AI_KEY_STORAGE = 'studyRPGGeminiApiKey';

  if ($('aiQuizKey')) {
    try {
      $('aiQuizKey').value =
        localStorage.getItem(AI_KEY_STORAGE) || '';
    } catch {}

    $('aiQuizKey').addEventListener('input', () => {
      try {
        const key = $('aiQuizKey').value.trim();

        if (key) {
          localStorage.setItem(AI_KEY_STORAGE, key);
        } else {
          localStorage.removeItem(AI_KEY_STORAGE);
        }
      } catch {
        toast('Không thể lưu API key trong trình duyệt này.');
      }
    });
  }

  if($('aiQuizForm'))$('aiQuizForm').addEventListener('submit',generateAIQuiz);
  if($('aiQuizHistoryCount'))$('aiQuizHistoryCount').textContent=`${quizHistory.length} câu đã ghi nhận`;
  if($('aiQuizClearHistory'))$('aiQuizClearHistory').addEventListener('click',()=>{if(confirm('Xóa lịch sử câu hỏi đã dùng? Các quiz sau có thể tạo lại câu cũ.')){quizHistory=[];saveQuizHistory();toast('Đã xóa lịch sử câu hỏi.');}});

})();

